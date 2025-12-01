# Render Configuration for Portfolio Backend

## Environment Variables
Set these in Render dashboard:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `PORT`: 5000 (or leave default)

## Build Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node 18+

## Deployment
1. Create new Web Service in Render
2. Connect to your GitHub repository
3. Set root directory to `portfolio-backend`
4. Configure environment variables
5. Deploy

## Health Check
The backend provides a health check endpoint at `/api/health` for monitoring.
