#!/usr/bin/env python3
"""
Log Export Script for Customer Chatbot

Exports chatbot logs to structured CSV files:
1. conversations.csv - Grouped by phone number (session)
2. messages.csv - All request/response messages with details
3. events.csv - All log events with metadata

Usage:
    python export_logs_to_csv.py [--logs-dir LOGS_DIR] [--output-dir OUTPUT_DIR] [--run-id RUN_ID]

Examples:
    python export_logs_to_csv.py
    python export_logs_to_csv.py --logs-dir ./logs --output-dir ./exports
    python export_logs_to_csv.py --run-id 20251226_103420
"""

import argparse
import ast
import csv
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


# Log line regex pattern
# Format: 2025-12-26 02:53:02 | INFO     | [42053:MainThread] | app.module.name                | message
LOG_PATTERN = re.compile(
    r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (\w+)\s*\| \[(\d+):(\w+)\] \| ([\w.]+)\s*\| (.*)$'
)

# Special log message patterns - use greedy match for dict/json payload
REQUEST_PATTERN = re.compile(r'Request Payload: (\{.+\})')
RESPONSE_PATTERN = re.compile(r'Response Payload: (\{.+\})')
CHAT_REQUEST_PATTERN = re.compile(r'Chat request from (\d+)')
INPUT_MESSAGE_PATTERN = re.compile(r'Input Message: (.+)')
WORKFLOW_COMPLETE_PATTERN = re.compile(r'Workflow execution complete for (\d+) - Intent: (\w+), Complete: (True|False)')
INTENT_PATTERN = re.compile(r'Node \[detect_intent\]: Raw: (\w+) -> Final: (\w+)')
EXTRACT_REQ_PATTERN = re.compile(r'Node \[extract_requirements\]: Merged requirements - (\d+) fields')
MISSING_DATA_PATTERN = re.compile(r'Node \[check_missing_data\]: Complete: (True|False), Missing: \[(.*?)\]')


@dataclass
class LogEvent:
    """Represents a single log event."""
    timestamp: str
    level: str
    process_id: str
    thread: str
    module: str
    message: str
    run_id: str = ""
    
    def to_dict(self) -> Dict[str, str]:
        return {
            'timestamp': self.timestamp,
            'level': self.level,
            'process_id': self.process_id,
            'thread': self.thread,
            'module': self.module,
            'message': self.message,
            'run_id': self.run_id
        }


@dataclass
class ChatMessage:
    """Represents a chat request/response pair."""
    run_id: str
    timestamp: str
    phone_number: str
    user_message: str = ""
    bot_response: str = ""
    intent: str = ""
    raw_intent: str = ""
    is_complete: bool = False
    extracted_requirements: Dict[str, Any] = field(default_factory=dict)
    missing_fields: List[str] = field(default_factory=list)
    should_ask_clarification: bool = False
    processing_time_sec: float = 0.0
    request_payload: str = ""
    response_payload: str = ""
    node_logs: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'run_id': self.run_id,
            'timestamp': self.timestamp,
            'phone_number': self.phone_number,
            'user_message': self.user_message,
            'bot_response': self.bot_response,
            'intent': self.intent,
            'raw_intent': self.raw_intent,
            'is_complete': self.is_complete,
            'extracted_requirements': json.dumps(self.extracted_requirements, ensure_ascii=False),
            'missing_fields': ', '.join(self.missing_fields),
            'should_ask_clarification': self.should_ask_clarification,
            'processing_time_sec': round(self.processing_time_sec, 3),
            'node_logs': '\n'.join(self.node_logs),
            'errors': '\n'.join(self.errors)
        }


@dataclass
class Conversation:
    """Represents a conversation session for a phone number."""
    phone_number: str
    run_id: str
    start_time: str = ""
    end_time: str = ""
    message_count: int = 0
    intents: List[str] = field(default_factory=list)
    final_is_complete: bool = False
    final_requirements: Dict[str, Any] = field(default_factory=dict)
    error_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'phone_number': self.phone_number,
            'run_id': self.run_id,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'message_count': self.message_count,
            'intents': ', '.join(self.intents),
            'final_is_complete': self.final_is_complete,
            'final_requirements': json.dumps(self.final_requirements, ensure_ascii=False),
            'error_count': self.error_count
        }


class LogParser:
    """Parses chatbot log files and extracts structured data."""
    
    def __init__(self, logs_dir: Path):
        self.logs_dir = logs_dir
        self.events: List[LogEvent] = []
        self.messages: List[ChatMessage] = []
        self.conversations: Dict[str, Conversation] = {}  # phone_number -> Conversation
    
    def parse_all(self) -> None:
        """Parse all log directories."""
        if not self.logs_dir.exists():
            print(f"❌ Logs directory not found: {self.logs_dir}")
            return
        
        run_dirs = sorted([d for d in self.logs_dir.iterdir() if d.is_dir()])
        print(f"📁 Found {len(run_dirs)} run directories")
        
        for run_dir in run_dirs:
            self.parse_run_directory(run_dir)
        
        print(f"✅ Parsed {len(self.events)} events, {len(self.messages)} messages, {len(self.conversations)} conversations")
    
    def parse_run_directory(self, run_dir: Path) -> None:
        """Parse a single run directory."""
        run_id = run_dir.name
        log_file = run_dir / "chatbot.log"
        
        if not log_file.exists():
            return
        
        print(f"  📄 Parsing {run_id}/chatbot.log...")
        
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Track current message being built
        current_message: Optional[ChatMessage] = None
        current_phone: Optional[str] = None
        request_start_time: Optional[datetime] = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            match = LOG_PATTERN.match(line)
            if not match:
                # Multi-line log continuation
                if current_message:
                    current_message.node_logs.append(f"  {line}")
                continue
            
            timestamp, level, process_id, thread, module, message = match.groups()
            
            # Create log event
            event = LogEvent(
                timestamp=timestamp,
                level=level,
                process_id=process_id,
                thread=thread,
                module=module.strip(),
                message=message,
                run_id=run_id
            )
            self.events.append(event)
            
            # Track errors
            if level == 'ERROR' and current_message:
                current_message.errors.append(message)
            
            # Detect chat request start
            chat_req_match = CHAT_REQUEST_PATTERN.search(message)
            if chat_req_match:
                phone = chat_req_match.group(1)
                current_phone = phone
                current_message = ChatMessage(
                    run_id=run_id,
                    timestamp=timestamp,
                    phone_number=phone
                )
                request_start_time = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
                continue
            
            # Extract input message
            input_match = INPUT_MESSAGE_PATTERN.search(message)
            if input_match and current_message:
                current_message.user_message = input_match.group(1)
                continue
            
            # Extract request payload
            req_match = REQUEST_PATTERN.search(message)
            if req_match and current_message:
                try:
                    payload = json.loads(req_match.group(1))
                    current_message.request_payload = req_match.group(1)
                    if 'message' in payload:
                        current_message.user_message = payload['message']
                except json.JSONDecodeError:
                    pass
                continue
            
            # Extract intent detection
            intent_match = INTENT_PATTERN.search(message)
            if intent_match and current_message:
                current_message.raw_intent = intent_match.group(1)
                current_message.intent = intent_match.group(2)
                continue
            
            # Extract missing data info
            missing_match = MISSING_DATA_PATTERN.search(message)
            if missing_match and current_message:
                current_message.is_complete = missing_match.group(1) == 'True'
                fields_str = missing_match.group(2)
                if fields_str:
                    current_message.missing_fields = [f.strip().strip("'") for f in fields_str.split(',')]
                continue
            
            # Capture node logs
            if 'Node [' in message and current_message:
                current_message.node_logs.append(message)
                continue
            
            # Extract response payload (end of request cycle)
            resp_match = RESPONSE_PATTERN.search(message)
            if resp_match and current_message:
                payload_str = resp_match.group(1)
                try:
                    # Try JSON first, then fall back to Python dict (ast.literal_eval)
                    try:
                        payload = json.loads(payload_str)
                    except json.JSONDecodeError:
                        # Python dict format (single quotes, None, True/False)
                        payload = ast.literal_eval(payload_str)
                    
                    current_message.response_payload = payload_str
                    current_message.bot_response = payload.get('response', '')
                    current_message.intent = payload.get('intent', current_message.intent) or ''
                    current_message.is_complete = payload.get('is_complete', False)
                    current_message.extracted_requirements = payload.get('extracted_requirements', {}) or {}
                    current_message.should_ask_clarification = payload.get('should_ask_clarification', False)
                    
                    # Calculate processing time
                    if request_start_time:
                        end_time = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
                        current_message.processing_time_sec = (end_time - request_start_time).total_seconds()
                    
                    # Save message
                    self.messages.append(current_message)
                    
                    # Update conversation
                    self._update_conversation(current_message)
                    
                    current_message = None
                    current_phone = None
                    request_start_time = None
                except (json.JSONDecodeError, ValueError, SyntaxError) as e:
                    # Log parse error but continue
                    pass
                continue
    
    def _update_conversation(self, msg: ChatMessage) -> None:
        """Update conversation tracking."""
        key = f"{msg.phone_number}_{msg.run_id}"
        
        if key not in self.conversations:
            self.conversations[key] = Conversation(
                phone_number=msg.phone_number,
                run_id=msg.run_id,
                start_time=msg.timestamp
            )
        
        conv = self.conversations[key]
        conv.end_time = msg.timestamp
        conv.message_count += 1
        if msg.intent:
            conv.intents.append(msg.intent)
        conv.final_is_complete = msg.is_complete
        conv.final_requirements = msg.extracted_requirements
        conv.error_count += len(msg.errors)
    
    def parse_single_run(self, run_id: str) -> None:
        """Parse a single run directory by ID."""
        run_dir = self.logs_dir / run_id
        if run_dir.exists():
            self.parse_run_directory(run_dir)
        else:
            print(f"❌ Run directory not found: {run_dir}")


def export_to_csv(parser: LogParser, output_dir: Path) -> None:
    """Export parsed data to CSV files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Export events
    events_file = output_dir / "events.csv"
    if parser.events:
        with open(events_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=parser.events[0].to_dict().keys())
            writer.writeheader()
            for event in parser.events:
                writer.writerow(event.to_dict())
        print(f"📝 Exported {len(parser.events)} events to {events_file}")
    
    # Export messages
    messages_file = output_dir / "messages.csv"
    if parser.messages:
        with open(messages_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=parser.messages[0].to_dict().keys())
            writer.writeheader()
            for msg in parser.messages:
                writer.writerow(msg.to_dict())
        print(f"📝 Exported {len(parser.messages)} messages to {messages_file}")
    
    # Export conversations
    conversations_file = output_dir / "conversations.csv"
    if parser.conversations:
        convs = list(parser.conversations.values())
        with open(conversations_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=convs[0].to_dict().keys())
            writer.writeheader()
            for conv in convs:
                writer.writerow(conv.to_dict())
        print(f"📝 Exported {len(convs)} conversations to {conversations_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Export Customer Chatbot logs to structured CSV files"
    )
    parser.add_argument(
        '--logs-dir',
        type=str,
        default='./logs',
        help='Path to logs directory (default: ./logs)'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./exports',
        help='Path to output directory for CSV files (default: ./exports)'
    )
    parser.add_argument(
        '--run-id',
        type=str,
        default=None,
        help='Specific run ID to export (e.g., 20251226_103420). If not specified, exports all runs.'
    )
    
    args = parser.parse_args()
    
    logs_dir = Path(args.logs_dir)
    output_dir = Path(args.output_dir)
    
    print("=" * 60)
    print("🚀 Customer Chatbot Log Exporter")
    print("=" * 60)
    print(f"📁 Logs directory: {logs_dir.absolute()}")
    print(f"📁 Output directory: {output_dir.absolute()}")
    if args.run_id:
        print(f"🔍 Specific run: {args.run_id}")
    print()
    
    log_parser = LogParser(logs_dir)
    
    if args.run_id:
        log_parser.parse_single_run(args.run_id)
    else:
        log_parser.parse_all()
    
    if log_parser.events or log_parser.messages:
        export_to_csv(log_parser, output_dir)
        print()
        print("✅ Export complete!")
    else:
        print("⚠️  No data found to export. Check logs directory.")


if __name__ == "__main__":
    main()
