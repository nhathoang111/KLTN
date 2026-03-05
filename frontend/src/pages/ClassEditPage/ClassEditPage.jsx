import React from 'react';
import { useParams } from 'react-router-dom';

const ClassEditPage = () => {
  const { id } = useParams();
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Class</h1>
        <p className="mt-1 text-sm text-gray-500">
          Edit class with ID: {id}
        </p>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <p className="text-gray-500">Class edit form will be implemented here.</p>
      </div>
    </div>
  );
};

export default ClassEditPage;



