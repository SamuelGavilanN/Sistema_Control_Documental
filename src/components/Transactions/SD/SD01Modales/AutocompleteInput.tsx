// src/components/Transactions/SD/SD01Modales/AutocompleteInput.tsx

import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  disabled?: boolean;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ value, onChange, suggestions, placeholder, disabled = false, onEnter, inputRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const actualRef = inputRef || internalRef;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBestMatch = (input: string): string | null => {
    if (!input) return null;
    const lowerInput = input.toLowerCase();
    return suggestions.find(s => s.toLowerCase().startsWith(lowerInput)) || null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const filtered = suggestions.filter(s => s.toLowerCase().includes(newValue.toLowerCase()));
    setFilteredSuggestions(filtered);
    setIsOpen(filtered.length > 0 && newValue.length > 0);
    setHighlightIndex(-1);
  };

  const handleSelect = (suggestion: string) => { onChange(suggestion); setIsOpen(false); actualRef.current?.focus(); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isOpen && highlightIndex >= 0) { e.preventDefault(); handleSelect(filteredSuggestions[highlightIndex]); }
      else { const bestMatch = getBestMatch(value); if (bestMatch) { e.preventDefault(); onChange(bestMatch); setIsOpen(false); } if (onEnter) onEnter(); }
    } else if (e.key === "Tab") { const bestMatch = getBestMatch(value); if (bestMatch) onChange(bestMatch); setIsOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (!isOpen && value) { const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())); setFilteredSuggestions(filtered); setIsOpen(true); setHighlightIndex(0); } else { setHighlightIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : prev); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex(prev => prev > 0 ? prev - 1 : prev); }
    else if (e.key === "Escape") { setIsOpen(false); }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input ref={actualRef} type="text" className="dc-input" value={value} onChange={handleInputChange} onFocus={() => { if (value) { const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())); setFilteredSuggestions(filtered); setIsOpen(filtered.length > 0); } }} onKeyDown={handleKeyDown} placeholder={placeholder} disabled={disabled} />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <div key={suggestion} className={`autocomplete-item ${index === highlightIndex ? "highlighted" : ""}`} onClick={() => handleSelect(suggestion)}>{suggestion}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;