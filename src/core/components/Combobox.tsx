import * as React from 'react';

interface ComboboxProps {
    options: string[];
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}

const Combobox = ({ options, value, onChange, placeholder }: ComboboxProps) => {
    // This is a placeholder Combobox component.
    // In a real scenario, this would have more complex logic for dropdowns, filtering, etc.
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mpeasy-combobox-input"
        >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    );
};

export default Combobox;
