// components/laboratory/LaboratoryHeader.tsx
import React from 'react';

interface LaboratoryHeaderProps {
  name: string;
  locationCity: string;
  locationState: string;
}

export const LaboratoryHeader: React.FC<LaboratoryHeaderProps> = ({ name, locationCity, locationState }) => (
  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg shadow-lg mb-6">
    <h1 className="text-4xl font-bold mb-2">{name}</h1>
    <p className="text-xl">{locationCity}, {locationState}</p>
  </div>
);