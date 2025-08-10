import * as React from 'react';
import { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
    options: string[];
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}

const Combobox = ({ options, value, onChange, placeholder }: ComboboxProps) => {
    const [inputValue, setInputValue] = useState(value);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue); // Allow free typing
    };

    const handleOptionClick = (option: string) => {
        setInputValue(option);
        onChange(option);
        setShowDropdown(false);
    };

    return (
        <div className="mpeasy-combobox-wrapper" ref={wrapperRef}>
            <input
                type="text"
                className="mpeasy-combobox-input"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setShowDropdown(true)}
                placeholder={placeholder}
            />
            {showDropdown && (
                <ul className="mpeasy-combobox-dropdown">
                    {options.map(option => (
                        <li key={option} onClick={() => handleOptionClick(option)}>
                            {option}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Combobox;
