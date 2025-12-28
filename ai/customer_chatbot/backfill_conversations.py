#!/usr/bin/env python3
"""
Backfill script to migrate conversation history from vector store to SQL database.
This syncs historical conversations from conversation_embeddings (pgvector) 
to the conversations table for all existing requests.
"""

import sys
import os
from datetime import datetime
from typing import List, Dict
import httpx

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.vector_store import VectorStoreService
from app.config import get_settings

def get_all_requests_from_backend() -> List[Dict]:
    """Fetch all requests from the backend API."""
    settings = get_settings()
    backend_url = settings.backend_api_url
    
    try:
        # Use the broker endpoint which doesn't require auth
        # Pass a broker_id to get all requests (342 is Mohamed Hanafy)
        response = httpx.get(f"{backend_url}/chatbot/broker/all-requests", params={"broker_id": 342})
        response.raise_for_status()
        requests = response.json()
        print(f"✅ Found {len(requests)} requests in database")
        return requests
    except Exception as e:
        print(f"❌ Error fetching requests: {e}")
        return []


def get_conversation_history(vector_store: VectorStoreService, phone_number: str) -> List[Dict]:
    """Retrieve conversation history from vector store."""
    try:
        messages = vector_store.get_conversation_history(phone_number, limit=50)
        print(f"  📝 Found {len(messages)} messages in vector store for {phone_number}")
        return messages
    except Exception as e:
        print(f"  ⚠️  Error retrieving history for {phone_number}: {e}")
        return []


def save_conversation_to_backend(request_id: int, actor_type: str, message: str, actor_id: int = None) -> bool:
    """Save a conversation message to the SQL database via backend API."""
    settings = get_settings()
    backend_url = settings.backend_api_url
    
    payload = {
        "related_request_id": request_id,
        "actor_type": actor_type,
        "message": message
    }
    
    if actor_id:
        payload["actor_id"] = actor_id
    
    try:
        response = httpx.post(f"{backend_url}/chatbot/conversations", json=payload)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"    ⚠️  Error saving message: {e}")
        return False


def backfill_request_conversations(
    request_id: int, 
    customer_phone: str, 
    customer_id: int,
    vector_store: VectorStoreService
) -> int:
    """Backfill conversation history for a single request."""
    print(f"\n🔄 Processing Request #{request_id} (Customer: {customer_phone})")
    
    # Get conversation history from vector store
    messages = get_conversation_history(vector_store, customer_phone)
    
    if not messages:
        print(f"  ℹ️  No conversation history found")
        return 0
    
    # Sync messages to SQL database
    synced_count = 0
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        
        if not content:
            continue
        
        # Map role to actor_type
        if role == "user":
            actor_type = "customer"
            actor_id = customer_id
        elif role == "assistant":
            actor_type = "ai"
            actor_id = None
        else:
            continue
        
        # Save to backend
        if save_conversation_to_backend(request_id, actor_type, content, actor_id):
            synced_count += 1
    
    print(f"  ✅ Synced {synced_count}/{len(messages)} messages")
    return synced_count


def main():
    """Main backfill process."""
    print("=" * 60)
    print("🚀 Starting Conversation History Backfill")
    print("=" * 60)
    
    # Initialize vector store
    print("\n📦 Initializing vector store...")
    vector_store = VectorStoreService()
    print("✅ Vector store initialized")
    
    # Fetch all requests
    print("\n📋 Fetching all requests from backend...")
    requests = get_all_requests_from_backend()
    
    if not requests:
        print("❌ No requests found. Exiting.")
        return
    
    # Process each request
    total_synced = 0
    processed = 0
    skipped = 0
    
    for req in requests:
        request_id = req.get("requestId")
        customer = req.get("customer", {})
        customer_phone = customer.get("phone")
        customer_id = customer.get("customerId")
        
        if not customer_phone:
            print(f"\n⚠️  Skipping Request #{request_id} (no phone number)")
            skipped += 1
            continue
        
        synced = backfill_request_conversations(
            request_id, 
            customer_phone, 
            customer_id,
            vector_store
        )
        
        total_synced += synced
        processed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Backfill Summary")
    print("=" * 60)
    print(f"✅ Processed: {processed} requests")
    print(f"⚠️  Skipped: {skipped} requests")
    print(f"📝 Total messages synced: {total_synced}")
    print("=" * 60)
    print("✅ Backfill complete!")


if __name__ == "__main__":
    main()
