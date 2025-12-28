import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartInterviewDto {
    @ApiProperty({ description: 'Application ID to start interview for' })
    @IsNotEmpty()
    @IsString()
    applicationId: string;
}

export class SubmitResponseDto {
    @ApiProperty({ description: 'Interview session ID' })
    @IsNotEmpty()
    @IsString()
    sessionId: string;

    @ApiProperty({ description: 'Response text from applicant' })
    @IsNotEmpty()
    @IsString()
    responseText: string;
}

export class UpdateSessionDto {
    @ApiPropertyOptional({ description: 'Current phase' })
    @IsOptional()
    @IsNumber()
    currentPhase?: number;

    @ApiPropertyOptional({ description: 'Question index within phase' })
    @IsOptional()
    @IsNumber()
    phaseQuestionIndex?: number;

    @ApiPropertyOptional({ description: 'Red flags detected' })
    @IsOptional()
    redFlags?: string[];

    @ApiPropertyOptional({ description: 'Phase scores' })
    @IsOptional()
    phaseScores?: { [key: string]: number };

    @ApiPropertyOptional({ description: 'Conversation context' })
    @IsOptional()
    conversationContext?: any[];
}
