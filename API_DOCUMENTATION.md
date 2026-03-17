# API Documentation - School Management System
**Version:** 1.0.0 | **Last Updated:** 17/3/2026

## Authentication
All requests require Bearer token in header:
```
Authorization: Bearer <token>
```

## Endpoints

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
  - Required: `email`, `password`, `role`
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create class
- `GET /api/classes/{id}/students` - Get students in class

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
  - Fields: `title`, `description`, `dueDate`, `classId`
- `PATCH /api/assignments/{id}/submit` - Submit assignment

## Response Format
```json
{
  "status": "success",
  "data": {},
  "timestamp": "2026-03-17T10:30:00Z"
}
```

## Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
