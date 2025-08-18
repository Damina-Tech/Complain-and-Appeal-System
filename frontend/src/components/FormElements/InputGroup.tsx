"use client";

import React from "react";

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  className?: string;
}

export default function InputGroup({ label, className, ...props }: InputGroupProps) {
  return (
    <div className={className}>
      <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
        {label}
      </label>
      <input
        className="w-full rounded border border-stroke bg-transparent py-3 px-5 outline-none 
                   focus:border-primary dark:border-form-strokedark dark:bg-form-input 
                   dark:focus:border-primary"
        {...props}  // ✅ forward props (value, onChange, name, etc.)
      />
    </div>
  );
}
