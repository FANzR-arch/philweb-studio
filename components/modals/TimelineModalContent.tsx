/**
 * [INPUT]   : 共享时间线内容
 * [OUTPUT]  : 经历与思考弹窗正文
 * [POS]     : Modal 内容层，复用时间轴的展开交互
 */

import React from 'react';
import { TimelineContent } from '../dashboard/TimelineSection';

export const TimelineModalContent: React.FC = () => (
  <div className="p-6 md:p-8">
    <TimelineContent mode="modal" />
  </div>
);
