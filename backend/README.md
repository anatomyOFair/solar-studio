# Solar Studio Backend API

FastAPI backend with MongoDB integration for the Solar Studio application.

## Features

- FastAPI REST API with automatic OpenAPI documentation
- MongoDB Atlas integration using Motor (async driver)
- CORS configured for frontend integration
- Heroku deployment ready
- Environment-based configuration

## Prerequisites

- Python 3.11+
- MongoDB Atlas account (free tier available)
- Heroku account (for deployment)
- Heroku CLI installed

## Local Development Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=solar_studio
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

### 3. MongoDB Atlas Setup

#### Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project (e.g., "Solar Studio")

#### Create a Cluster

1. Click "Build a Database"
2. Choose the **FREE** (M0) tier
3. Select a cloud provider and region closest to you
4. Click "Create"

#### Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click "Add IP Address"
3. For local development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, you should whitelist specific IPs
4. Click "Confirm"

#### Create Database User

1. Go to **Database Access** in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and secure password (save these!)
5. Under "Database User Privileges", select "Atlas admin" or "Read and write to any database"
6. Click "Add User"

#### Get Connection String

1. Go back to **Database** (Clusters)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Python" and version "3.11 or later"
5. Copy the connection string (it looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
6. Replace `<username>` and `<password>` with your database user credentials
7. Add your database name after the `?` (or replace existing query params):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/solar_studio?retryWrites=true&w=majority
   ```

#### Update .env File

Update your `.env` file with the MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/solar_studio?retryWrites=true&w=majority
```

### 4. Run the Application

```bash
uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- Swagger UI (Interactive docs): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## API Endpoints

### Health Check
- `GET /health` - Check API and database status

### Celestial Objects
- `GET /api/celestial-objects` - Get all celestial objects
- `GET /api/celestial-objects/{id}` - Get celestial object by ID
- `POST /api/celestial-objects` - Create new celestial object
- `PUT /api/celestial-objects/{id}` - Update celestial object
- `DELETE /api/celestial-objects/{id}` - Delete celestial object

### Visibility
- `POST /api/visibility/calculate` - Calculate visibility between positions

**Note**: Most endpoints are placeholders. You'll need to implement the MongoDB operations in `app/routers/api.py`.

## Heroku Deployment

### 1. Install Heroku CLI

Download and install from [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
cd backend
heroku create your-app-name
```

Replace `your-app-name` with your desired app name (must be unique).

### 4. Set Environment Variables

Set your MongoDB Atlas connection string:

```bash
heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/solar_studio?retryWrites=true&w=majority"
```

Set your frontend URL for CORS:

```bash
heroku config:set FRONTEND_URL="https://your-frontend-url.vercel.app"
```

Set environment:

```bash
heroku config:set ENVIRONMENT="production"
```

You can set multiple variables:

```bash
heroku config:set MONGODB_URI="..." FRONTEND_URL="https://..." ENVIRONMENT="production" MONGODB_DATABASE="solar_studio"
```

### 5. Configure MongoDB Atlas for Heroku

In MongoDB Atlas **Network Access**, make sure you allow access from anywhere (0.0.0.0/0) since Heroku uses dynamic IPs. Alternatively, you can whitelist the specific IP ranges, but allowing from anywhere is simpler for now.

### 6. Deploy to Heroku

Initialize git if not already done:

```bash
git init
```

Create a `.gitignore` if it doesn't exist:

```bash
echo "__pycache__/
*.py[cod]
*$py.class
.env
.venv
venv/
ENV/
" > .gitignore
```

Add and commit files:

```bash
git add .
git commit -m "Initial backend setup"
```

Deploy to Heroku:

```bash
git push heroku main
```

If your default branch is `master`:

```bash
git push heroku master
```

Or if you're on a different branch:

```bash
git push heroku your-branch:main
```

### 7. Verify Deployment

```bash
heroku open
```

This will open your app in the browser. You can also check:

- API: `https://your-app-name.herokuapp.com`
- Docs: `https://your-app-name.herokuapp.com/docs`
- Health: `https://your-app-name.herokuapp.com/health`

### 8. View Logs

```bash
heroku logs --tail
```

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Your commit message"
git push heroku main
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # MongoDB connection
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   └── routers/
│       ├── __init__.py
│       └── api.py           # API endpoints
├── requirements.txt         # Python dependencies
├── Procfile                 # Heroku process file
├── runtime.txt              # Python version
├── .env.example             # Example environment variables
└── README.md                # This file
```

## Next Steps

1. **Implement MongoDB Operations**: Update the endpoints in `app/routers/api.py` with actual MongoDB queries
2. **Port Visibility Calculations**: Port your TypeScript visibility calculator logic to Python in a new module
3. **Add Authentication**: If needed, add JWT or OAuth authentication
4. **Add Validation**: Enhance request validation and error handling
5. **Add Tests**: Write unit and integration tests

## Troubleshooting

### MongoDB Connection Issues

- Verify your connection string is correct
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure your database user has proper permissions

### Heroku Deployment Issues

- Check logs: `heroku logs --tail`
- Verify environment variables: `heroku config`
- Ensure `Procfile` and `runtime.txt` are correct
- Make sure `requirements.txt` includes all dependencies

## License

Part of the Solar Studio project.
