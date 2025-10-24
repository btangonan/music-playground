import { SOUND_ICONS } from './SoundIcons';

interface IconGalleryProps {
  selectedSound: string | null;
  onSelectSound: (soundId: string) => void;
  onSelectSoundForPlacement?: (soundId: string) => void;
  onDragStart?: (soundId: string) => void;
  onDragEnd?: () => void;
  onPreviewSound?: (soundId: string) => void;
  isMobile?: boolean;
}

export default function IconGallery({ selectedSound, onSelectSound, onSelectSoundForPlacement, onDragStart, onDragEnd, onPreviewSound, isMobile }: IconGalleryProps) {
  return (
    <div
      className={isMobile ? "w-full" : "flex items-center justify-center"}
      style={{
        paddingTop: '8px',
        paddingBottom: '8px'
      }}
    >
      <div
        className={isMobile ? "grid grid-cols-6 gap-2 px-4" : "flex gap-[6px] items-start"}
        style={isMobile ? { gridTemplateRows: 'repeat(2, 1fr)' } : {}}
      >
        {SOUND_ICONS.map((sound, index) => {
          const IconComponent = sound.icon;
          const isSelected = selectedSound === sound.id;

          return (
            <div
              key={sound.id}
              className="flex flex-col items-center gap-1"
              style={isMobile ? { width: '100%' } : { width: '44px' }}
            >
              <div
                draggable
                onClick={() => {
                  onSelectSound(sound.id);
                  onSelectSoundForPlacement?.(sound.id);
                  onPreviewSound?.(sound.id);
                }}
                className={`
                  flex-shrink-0 cursor-pointer flex items-center justify-center relative
                  transition-all duration-150
                  ${isSelected ? 'scale-110 ring-4 ring-blue-500 rounded-full' : 'hover:scale-110'}
                `}
                style={isMobile ? {
                  width: '100%',
                  aspectRatio: '1',
                  padding: '2px'
                } : {
                  width: '44px',
                  height: '44px',
                  padding: '2px'
                }}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('soundId', sound.id);
                  console.log('🎯 DRAG START from gallery:', {
                    soundId: sound.id,
                    metaKey: e.metaKey
                  });
                  onSelectSound(sound.id);
                  onDragStart?.(sound.id);

                  // Create a completely transparent DOM element for drag image
                  const emptyDiv = document.createElement('div');
                  emptyDiv.style.width = '1px';
                  emptyDiv.style.height = '1px';
                  emptyDiv.style.position = 'absolute';
                  emptyDiv.style.top = '-9999px';
                  emptyDiv.style.opacity = '0';
                  document.body.appendChild(emptyDiv);
                  e.dataTransfer.setDragImage(emptyDiv, 0, 0);

                  // Clean up after a short delay
                  setTimeout(() => {
                    if (document.body.contains(emptyDiv)) {
                      document.body.removeChild(emptyDiv);
                    }
                  }, 0);
                }}
                onDragEnd={() => {
                  onDragEnd?.();
                }}
              >
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconComponent />
                </div>
              </div>

              {/* Label beneath icon */}
              <span
                style={{
                  fontSize: isMobile ? '8px' : '9px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontWeight: 500,
                  color: 'rgba(0,0,0,0.6)',
                  textAlign: 'center',
                  lineHeight: '1',
                  whiteSpace: 'nowrap'
                }}
              >
                {sound.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
