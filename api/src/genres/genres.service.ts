import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const genre = await this.prisma.genre.findUnique({ where: { id } });
    if (!genre) throw new NotFoundException('Genre not found');
    return genre;
  }

  async create(dto: CreateGenreDto) {
    const exists = await this.prisma.genre.findUnique({
      where: { name: dto.name },
    });
    if (exists) throw new ConflictException('Genre already exists');
    return this.prisma.genre.create({ data: { name: dto.name } });
  }

  async update(id: number, dto: UpdateGenreDto) {
    await this.findOne(id);
    if (dto.name) {
      const clash = await this.prisma.genre.findUnique({
        where: { name: dto.name },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException('Genre already exists');
      }
    }
    return this.prisma.genre.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    const books = await this.prisma.book.count({ where: { genreId: id } });
    if (books > 0) throw new ConflictException('Genre still has books');
    return this.prisma.genre.delete({ where: { id } });
  }
}