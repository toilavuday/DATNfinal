import { User } from '@prisma/client';
import { UserService } from './user.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UpdateUserDto } from '../../shared/dto/User.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiParam } from '@nestjs/swagger';

@ApiTags('Users') 
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @ApiOperation({ summary: 'Retrieve all users' }) 
  async getAllUser(): Promise<User[]> {
    return this.userService.getAllUser();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve user by ID' })
  @ApiParam({ name: 'id', description: 'ID of the user to retrieve' })
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID of the user to update' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<User> {
    return this.userService.updateUser(id, {
      ...updateUserDto,
      image: file,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', description: 'ID of the user to delete' })
  async deleteUser(@Param('id') id: string): Promise<User> {
    return this.userService.deleteUser(id);
  }

  @Put(':id/lock')
  @ApiOperation({ summary: 'Lock a user account by ID' })
  @ApiParam({ name: 'id', description: 'ID of the user to lock' })
  async lockUser(@Param('id') id: string) {
    const user = await this.userService.lockUser(id);
    return { user };
  }
}
