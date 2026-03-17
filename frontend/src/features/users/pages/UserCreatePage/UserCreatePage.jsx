import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserCreateForm from '../../components/UserCreateForm';

const UserCreatePage = () => {
  const navigate = useNavigate();
  return (
    <div className="px-4 py-6">
      <UserCreateForm
        onCancel={() => navigate('/users')}
        onCreated={() => {
          // Giữ behavior cũ: tạo xong quay về danh sách
          setTimeout(() => navigate('/users'), 700);
        }}
      />
    </div>
  );
};

export default UserCreatePage;




