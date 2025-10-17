import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface KeySelectorProps {
  selectedKey: string;
  onKeyChange: (key: string) => void;
}

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export default function KeySelector({ selectedKey, onKeyChange }: KeySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (key: string) => {
    onKeyChange(key);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* Label */}
      <span 
        className="text-[rgba(0,0,0,0.55)]"
        style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px' }}
      >
        Key:
      </span>
      
      {/* Button */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 bg-transparent outline-none border-none"
        style={{
          fontFamily: 'Inter',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          padding: 0
        }}
      >
        <span>{selectedKey}</span>
        <ChevronDown size={14} strokeWidth={2} className="text-[rgba(0,0,0,0.55)]" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute rounded-lg border bg-white overflow-auto"
          style={{
            width: '80px',
            maxHeight: '280px',
            top: 'calc(100% + 8px)',
            left: 0,
            borderColor: 'rgba(0,0,0,0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '4px',
            zIndex: 50
          }}
        >
          {KEYS.map((key) => {
            const isSelected = key === selectedKey;
            
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="w-full text-center px-2 py-1.5 rounded-md transition-all duration-100"
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: isSelected ? 600 : 500,
                  backgroundColor: isSelected ? '#FFD11A' : 'transparent',
                  color: 'black',
                  cursor: 'pointer',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,209,26,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
