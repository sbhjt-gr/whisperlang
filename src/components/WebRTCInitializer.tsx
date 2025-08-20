import React, { useContext, useEffect } from 'react';
import { WebRTCContext } from '../store/WebRTCProvider';
import { videoCallService } from '../services/VideoCallService';

interface Props {
  children: React.ReactNode;
}

const WebRTCInitializer: React.FC<Props> = ({ children }) => {
  const webRTCContext = useContext(WebRTCContext);

  useEffect(() => {
    videoCallService.setWebRTCContext(webRTCContext);
  }, [webRTCContext]);

  return <>{children}</>;
};

export default WebRTCInitializer;