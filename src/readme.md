# YouTube Backend Clone

A scalable and feature-rich backend system for a YouTube-like platform. This project implements essential features such as video uploads, user management, likes, comments modern backend technologies.

## Features

- **User Authentication**: Secure login and registration using JWT.
- **Video Management**: Upload, delete, and manage video content.
- **User Interaction**: Like, comment, and subscribe to channels.
- **Search**: Search for videos.
- **Playlists**: Create, update, and manage video playlists.

---

## Tech Stack

- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB for scalable data storage
- **Authentication**: JSON Web Tokens (JWT)
- **Cloud Storage**: Cloudinary for video file storage

---

## Installation

### Prerequisites

- Node.js (v16+)
- MongoDB

### Steps

1. Clone the repository:
```bash
git clone https://github.com/abhaysharma1/Youtube-backend-clone.git
cd youtube-backend-clone
```
2. Install dependencies
```bash
npm install
```
3. Set up environment variables: Create a `.env` file in the root directory with the following keys:
```bash
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your_s3_bucket_name
REDIS_URI=your_redis_connection_string
```
4. Start the server
```bash
npm start
```
## API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Endpoints

#### Authentication

- **POST /users/register**: Register a new user
- **POST /users/login**: Authenticate a user and return a token

#### Video Management

- **POST /videos/upload**: Upload a new video
- **GET /videos/:id**: Get details of a specific video
- **DELETE /videos/:id**: Delete a video

---

## Folder Structure

```
youtube-backend-clone/
├── src/
│   ├── controllers/   # Route handlers
│   ├── models/        # Mongoose models
│   ├── routes/        # API route definitions
│   ├── services/      # Business logic and external services
│   ├── utils/         # Utility functions
│   └── app.js         # Express app configuration
├── tests/             # Unit and integration tests
├── .env               # Environment variables
├── package.json       # Dependencies and scripts
└── README.md          # Project documentation
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.
