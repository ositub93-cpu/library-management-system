import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

interface FindAllParams {
  genreId?: number;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: FindAllParams) {
    const page = Math.max(1, params.page);
    const limit = Math.min(Math.max(1, params.limit), 100);
    const search = params.search?.trim();

    const where: Prisma.BookWhereInput = {};
    if (params.genreId) where.genreId = params.genreId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

      const [data, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        include: { genre: true },
        orderBy: { title: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { genre: true },
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async create(dto: CreateBookDto) {
    await this.assertGenreExists(dto.genreId);
    await this.assertUnique(dto.isbn, dto.title, dto.author);
    return this.prisma.book.create({ data: dto, include: { genre: true } });
  }

  async update(id: number, dto: UpdateBookDto) {
    const existing = await this.findOne(id);
    if (dto.genreId) await this.assertGenreExists(dto.genreId);
    await this.assertUnique(
      dto.isbn,
      dto.title ?? existing.title,
      dto.author ?? existing.author,
      id,
    );
    return this.prisma.book.update({
      where: { id },
      data: dto,
      include: { genre: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.book.delete({ where: { id } });
  }

  private async assertGenreExists(genreId: number) {
    const genre = await this.prisma.genre.findUnique({
      where: { id: genreId },
    });
    if (!genre) throw new BadRequestException('Genre does not exist');
  }

  private async assertUnique(
    isbn: string | undefined,
    title: string,
    author: string,
    ignoreId?: number,
  ) {
    if (isbn) {
      const byIsbn = await this.prisma.book.findUnique({ where: { isbn } });
      if (byIsbn && byIsbn.id !== ignoreId) {
        throw new ConflictException('ISBN already exists');
      }
    }
    const byTitle = await this.prisma.book.findUnique({
      where: { title_author: { title, author } },
    });
    if (byTitle && byTitle.id !== ignoreId) {
      throw new ConflictException('A book with this title and author exists');
    }
  }
}