import { SOUND_ICONS } from './SoundIcons';

interface IconGalleryProps {
  selectedSound: string | null;
  onSelectSound: (soundId: string) => void;
  onDragStart?: (soundId: string) => void;
  onDragEnd?: () => void;
  onPreviewSound?: (soundId: string) => void;
}

export default function IconGallery({ selectedSound, onSelectSound, onDragStart, onDragEnd, onPreviewSound }: IconGalleryProps) {
  return (
    <div 
      className="flex items-center justify-center"
      style={{ 
        height: '48px'
      }}
    >
      <div className="flex gap-[6px] items-center">
        {SOUND_ICONS.map((sound) => {
          const IconComponent = sound.icon;
          const isSelected = selectedSound === sound.id;
          
          return (
            <div
              key={sound.id}
              draggable
              onClick={() => {
                onSelectSound(sound.id);
                onPreviewSound?.(sound.id);
              }}
              className={`
                flex-shrink-0 cursor-pointer flex items-center justify-center
                transition-all duration-150
                ${isSelected ? 'scale-110' : 'hover:scale-110'}
              `}
              style={{
                width: '44px',
                height: '44px',
                padding: '2px'
              }}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('soundId', sound.id);
                onSelectSound(sound.id);
                onDragStart?.(sound.id);

                // Centered, invisible drag image (40x40) to match sequencer ghost and avoid OS glyphs
                const dragImg = document.createElement('div');
                dragImg.style.width = '40px';
                dragImg.style.height = '40px';
                dragImg.style.position = 'absolute';
                dragImg.style.top = '-9999px';
                dragImg.style.opacity = '0';
                document.body.appendChild(dragImg);
                e.dataTransfer.setDragImage(dragImg, 20, 20);
                setTimeout(() => { if (document.body.contains(dragImg)) document.body.removeChild(dragImg); }, 0);
              }}
              onDragEnd={() => {
                onDragEnd?.();
              }}
            >
              <div style={{ width: '40px', height: '40px' }}>
                <IconComponent />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
