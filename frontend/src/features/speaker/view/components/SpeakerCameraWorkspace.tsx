import React from 'react';
import { ChamberVideoGrid } from '../../../../shared/components/ChamberVideoGrid';
import { SpeakerTranscriptFeed } from '../../../chamber-monitoring/view/SpeakerTranscriptFeed';
import { CameraViewMode } from '../../model/speaker.types';
import { Member } from '../../../../shared/types';

interface SpeakerCameraWorkspaceProps {
  cameraMode?: CameraViewMode;
  onCameraModeChange?: (mode: CameraViewMode) => void;
  activeSpeakerMember?: Member | undefined;
  members?: Member[];
}

export const SpeakerCameraWorkspace: React.FC<SpeakerCameraWorkspaceProps> = () => {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
      {/* Chamber video feeds */}
      <div className="flex-1 min-h-0">
        <ChamberVideoGrid memberCameras={false} />
      </div>

      {/* Live speech-to-text — text only, AI-flagged rows, audio alerts */}
      <div className="h-80 flex-shrink-0 rounded-xl overflow-hidden">
        <SpeakerTranscriptFeed />
      </div>
    </div>
  );
};
