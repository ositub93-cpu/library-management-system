import { Transform } from 'class-transformer';
import {
  IsInt,
  IsISBN,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBookDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  author: string;

  @Transform(trim)
  @IsISBN()
  isbn: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  totalCopies: number;

  @IsInt()
  @Min(1)
  genreId: number;
}