import { RestfulFactory } from 'nicot';
import { UserCenterController } from './user-center.controller';
import { ApiOkResponse } from '@nestjs/swagger';
import { SimpleUserExtraOptions } from '../options';

export const patchUserCenterControllerMe = (extras: SimpleUserExtraOptions) => {
  const userCenterControllerMeDescriptor = Object.getOwnPropertyDescriptor(
    UserCenterController.prototype,
    'getCurrentUser',
  );
  ApiOkResponse({
    type: new RestfulFactory(extras.userClass, {
      relations: extras.userServiceCrudExtras?.relations || [],
    }).entityReturnMessageDto,
  })(
    UserCenterController.prototype,
    'getCurrentUser',
    userCenterControllerMeDescriptor,
  );
};
