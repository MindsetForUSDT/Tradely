import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TagsService } from './tags.service';

@Controller('tags')
@UseGuards(AuthGuard('jwt'))
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.tagsService.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() body: { name: string; color?: string; category?: string }) {
    return this.tagsService.create(req.user.id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.tagsService.remove(req.user.id, id);
  }

  @Post(':tradeId/tags/:tagId')
  attach(@Req() req: any, @Param('tradeId') tradeId: string, @Param('tagId') tagId: string) {
    return this.tagsService.attachToTrade(req.user.id, tradeId, tagId);
  }

  @Delete(':tradeId/tags/:tagId')
  detach(@Req() req: any, @Param('tradeId') tradeId: string, @Param('tagId') tagId: string) {
    return this.tagsService.detachFromTrade(req.user.id, tradeId, tagId);
  }
}