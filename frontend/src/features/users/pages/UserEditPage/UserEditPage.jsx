import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserEditForm from '../../components/UserEditForm';

const UserEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="px-4 py-6">
      <UserEditForm
        userId={id}
        onCancel={() => navigate('/users')}
        onUpdated={() => {
          setTimeout(() => navigate('/users'), 700);
        }}
      />
    </div>
  );
};

export default UserEditPage;

