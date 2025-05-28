'use client';

import CarModifier from './experiences/[experienceId]/CarModifier';

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <CarModifier experienceId="default" />
      </div>
    </div>
  );
}
