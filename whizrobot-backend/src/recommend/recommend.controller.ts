import { Body, Controller, Post } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendDto } from './dto/recommend.dto';

@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post()
  async recommend(@Body() dto: RecommendDto) {
    return this.recommendService.recommend(dto.query, dto.org_id);
  }
}
