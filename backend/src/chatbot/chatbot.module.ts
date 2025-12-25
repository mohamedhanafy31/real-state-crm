import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { RequestsModule } from '../requests/requests.module';
import { ProjectsModule } from '../projects/projects.module';
import { AreasModule } from '../areas/areas.module';

@Module({
    imports: [RequestsModule, ProjectsModule, AreasModule],
    controllers: [ChatbotController],
})
export class ChatbotModule { }
