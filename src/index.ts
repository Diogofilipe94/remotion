import { registerComposition } from 'remotion';
import VideoRoot from './VideoRoot';

registerComposition({
  id: 'VideoRoot',
  component: VideoRoot,
  durationInFrames: 150,
  fps: 30,
  width: 1920,
  height: 1080,
  defaultProps: {
    title: 'Título Padrão',
    subtitle: 'Subtítulo Padrão',
    backgroundColor: '#000000',
    textColor: '#ffffff'
  }
});
