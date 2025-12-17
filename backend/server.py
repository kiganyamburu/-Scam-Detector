from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
import json
import google.generativeai as genai
import base64
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import secrets


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "test_database")]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Get API keys
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# Define Models
class ScamAnalysisRequest(BaseModel):
    image_base64: str


class ScamIndicator(BaseModel):
    title: str
    explanation: str
    severity: str  # 'low', 'medium', 'high'


class ScamAnalysisResponse(BaseModel):
    score: int  # 0-100
    risk_level: str  # 'safe', 'suspicious', 'scam'
    indicators: list[ScamIndicator]
    summary: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class AppleAuthRequest(BaseModel):
    id_token: str
    user_data: Optional[dict] = None  # Apple only sends this on first sign-in


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            )

        # Get user from database
        user = await db.users.find_one({"_id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except JWTError:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials"
        )


@api_router.get("/")
async def root():
    return {"message": "Scam Detection API"}


@api_router.post("/auth/google", response_model=AuthResponse)
async def google_auth(auth_request: GoogleAuthRequest):
    """
    Authenticate user with Google ID token
    """
    try:
        # Verify the token with Google
        # Note: In production, you should configure GOOGLE_CLIENT_ID in env
        idinfo = id_token.verify_oauth2_token(
            auth_request.id_token, google_requests.Request()
        )

        # Extract user information
        user_id = idinfo["sub"]
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        # Check if user exists, if not create new user
        user = await db.users.find_one({"_id": user_id})
        if not user:
            user = {
                "_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "provider": "google",
                "created_at": datetime.utcnow(),
            }
            await db.users.insert_one(user)

        # Create access token
        access_token = create_access_token(data={"sub": user_id})

        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={"email": email, "name": name, "picture": picture},
        )
    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@api_router.post("/auth/apple", response_model=AuthResponse)
async def apple_auth(auth_request: AppleAuthRequest):
    """
    Authenticate user with Apple ID token
    Note: This is a simplified implementation. In production, you should verify the token properly.
    """
    try:
        # Decode without verification for now (simplified)
        # In production, implement proper Apple token verification with certificate chain
        unverified = jwt.get_unverified_claims(auth_request.id_token)

        user_id = unverified.get("sub")
        email = unverified.get("email")

        # Check if user exists
        user = await db.users.find_one({"_id": user_id})

        # Handle first-time sign in with user data
        if not user and auth_request.user_data:
            user = {
                "_id": user_id,
                "email": email or auth_request.user_data.get("email"),
                "name": auth_request.user_data.get("fullName", {}).get(
                    "givenName", "User"
                ),
                "provider": "apple",
                "created_at": datetime.utcnow(),
            }
            await db.users.insert_one(user)
        elif not user:
            # User exists but we don't have their data
            user = {
                "_id": user_id,
                "email": email,
                "name": "User",
                "provider": "apple",
                "created_at": datetime.utcnow(),
            }
            await db.users.insert_one(user)

        # Create access token
        access_token = create_access_token(data={"sub": user_id})

        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "email": user.get("email"),
                "name": user.get("name"),
                "picture": user.get("picture"),
            },
        )
    except Exception as e:
        logger.error(f"Apple auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@api_router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current user information
    """
    return {
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "picture": current_user.get("picture"),
    }


class ErrorDetail(BaseModel):
    error: str
    details: str
    timestamp: str
    logs: Optional[list[str]] = None


@api_router.post("/analyze", response_model=ScamAnalysisResponse)
async def analyze_image(request: ScamAnalysisRequest):
    """
    Analyze an image (email or letter) for scam indicators
    """
    error_logs = []
    try:
        # Validate image data
        if not request.image_base64:
            error_logs.append("❌ Empty image data received")
            logger.error("Empty image data received")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid Image",
                    "details": "The image data is empty or invalid. Please try uploading a different image.",
                    "logs": error_logs,
                },
            )

        error_logs.append("✅ Image data validated")
        logger.info("Starting image analysis")

        # Check API key
        if not GOOGLE_API_KEY:
            error_logs.append("❌ API key not configured")
            logger.error("GOOGLE_API_KEY not found in environment")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Configuration Error",
                    "details": "AI service is not properly configured. Please contact support.",
                    "logs": error_logs,
                },
            )

        error_logs.append("✅ API key found")

        # Initialize Gemini API
        try:
            genai.configure(api_key=GOOGLE_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            error_logs.append("✅ AI service initialized")
        except Exception as e:
            error_logs.append(f"❌ Failed to initialize AI service: {str(e)}")
            logger.error(f"Failed to initialize Gemini: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "AI Service Error",
                    "details": f"Could not connect to AI service: {str(e)}",
                    "logs": error_logs,
                },
            )

        # Prepare the system message and prompt
        system_message = """You are a scam detection expert. Analyze ANY image for potential scams, fraud, or suspicious content. This includes:
        - Emails and letters
        - Social media profiles (Facebook, Instagram, LinkedIn, Twitter, etc.)
        - Text messages and chat screenshots
        - Announcements and notices
        - Advertisements and promotional content
        - Investment opportunities
        - Dating profiles
        - Marketplace listings
        - Job postings
        - Any other content that could potentially be a scam
        
        Your response must ALWAYS be in JSON format with this exact structure:
        {
            "score": <number 0-100>,
            "risk_level": "<safe|suspicious|scam>",
            "summary": "<brief summary in simple language>",
            "indicators": [
                {
                    "title": "<indicator name>",
                    "explanation": "<simple explanation that a grandmother can understand>",
                    "severity": "<low|medium|high>"
                }
            ]
        }
        
        Score guide:
        - 0-30: Safe (legitimate or low risk)
        - 31-60: Suspicious (needs caution, verify before trusting)
        - 61-100: Scam (dangerous, likely fraudulent)
        
        Common scam indicators across all platforms:
        
        **Emails & Messages:**
        - Urgent/threatening language ("act now or lose access")
        - Requests for passwords, SSN, or banking info
        - Suspicious sender addresses or domains
        - Poor grammar, spelling errors, or odd formatting
        - Unexpected prizes, refunds, or inheritance claims
        - Suspicious links or attachments
        
        **Social Media Profiles:**
        - Newly created accounts with few posts/followers
        - Stock photos or stolen profile pictures
        - Promises of easy money, get-rich-quick schemes
        - Romantic advances from strangers (romance scams)
        - Impersonation of celebrities, officials, or brands
        - Requests to move conversation off-platform quickly
        - No mutual friends or suspicious friend lists
        - Profile information inconsistencies
        
        **Investment & Money Schemes:**
        - Guaranteed high returns with no risk
        - Pyramid or multi-level marketing schemes
        - Cryptocurrency "opportunities" with urgent deadlines
        - Requests for upfront payments or "processing fees"
        - Pressure to invest quickly without research time
        
        **Marketplace & Job Postings:**
        - Deals that are too good to be true
        - Requests for payment via untraceable methods (gift cards, wire transfer, crypto)
        - Job offers requiring upfront payment for training/equipment
        - Overpayment scams with refund requests
        - Vague job descriptions with high pay promises
        
        **Red Flags Across All Types:**
        - Requests for money or gift cards
        - Pressure tactics and artificial urgency
        - Requests to bypass normal procedures
        - Unsolicited contact
        - Too good to be true offers
        - Inconsistent or vague information
        - Requests to keep things secret
        - Poor communication or evasive answers
        
        IMPORTANT: Explain everything in simple, grandma-friendly language. Be helpful and clear about WHY something is suspicious, not just THAT it's suspicious."""

        # Process the base64 image
        try:
            # Decode base64 image
            image_data = base64.b64decode(request.image_base64)
            error_logs.append("✅ Image content prepared")
        except Exception as e:
            error_logs.append(f"❌ Failed to process image: {str(e)}")
            logger.error(f"Failed to decode image: {e}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Image Processing Error",
                    "details": f"Failed to process the image: {str(e)}. Make sure you're uploading a valid image file.",
                    "logs": error_logs,
                },
            )

        # Create the prompt
        prompt = f"""{system_message}

Analyze this image for scam indicators. It could be anything - an email, social media profile, text message, advertisement, job posting, or any other content. Provide a detailed analysis with a scam score from 0-100 and explain each indicator in simple language that anyone can understand."""
        error_logs.append("✅ Analysis request prepared")

        # Send request to Gemini and get response
        try:
            logger.info("Sending request to AI service")
            # Upload the image data
            image_part = {"mime_type": "image/jpeg", "data": image_data}
            response = model.generate_content([prompt, image_part])
            error_logs.append("✅ AI analysis completed")
            logger.info("Received response from AI service")
            response_text = response.text
        except Exception as e:
            error_logs.append(f"❌ AI analysis failed: {str(e)}")
            logger.error(f"AI service request failed: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "AI Analysis Failed",
                    "details": f"The AI service encountered an error: {str(e)}. This might be a temporary issue - please try again.",
                    "logs": error_logs,
                },
            )

        # Parse the JSON response
        try:
            # Remove markdown code blocks if present
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            error_logs.append(
                f"📄 Raw AI response received ({len(response_text)} chars)"
            )

            # Parse JSON
            analysis_data = json.loads(response_text)
            error_logs.append("✅ Response parsed successfully")

            # Validate required fields
            required_fields = ["score", "risk_level", "indicators", "summary"]
            missing_fields = [
                field for field in required_fields if field not in analysis_data
            ]
            if missing_fields:
                error_logs.append(
                    f"❌ Missing fields in response: {', '.join(missing_fields)}"
                )
                raise ValueError(
                    f"Missing required fields: {', '.join(missing_fields)}"
                )

            error_logs.append("✅ Response validation passed")

        except json.JSONDecodeError as e:
            error_logs.append(f"❌ JSON parsing failed: {str(e)}")
            error_logs.append(f"📄 Response preview: {response_text[:200]}...")
            logger.error(f"JSON parsing error: {e}")
            logger.error(f"Response text: {response_text}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Response Parsing Error",
                    "details": f"Failed to parse AI response. The AI returned invalid data format: {str(e)}",
                    "logs": error_logs,
                },
            )
        except ValueError as e:
            error_logs.append(f"❌ Validation failed: {str(e)}")
            logger.error(f"Response validation error: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Invalid Response Format",
                    "details": f"AI response is missing required information: {str(e)}",
                    "logs": error_logs,
                },
            )

        # Create response model
        try:
            indicators = [ScamIndicator(**ind) for ind in analysis_data["indicators"]]

            result = ScamAnalysisResponse(
                score=analysis_data["score"],
                risk_level=analysis_data["risk_level"],
                indicators=indicators,
                summary=analysis_data["summary"],
            )
            error_logs.append("✅ Analysis completed successfully!")
            logger.info(f"Analysis completed successfully with score: {result.score}")

            return result
        except Exception as e:
            error_logs.append(f"❌ Failed to create response: {str(e)}")
            logger.error(f"Failed to create response model: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Response Creation Error",
                    "details": f"Failed to format the analysis results: {str(e)}",
                    "logs": error_logs,
                },
            )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any unexpected errors
        error_logs.append(f"❌ Unexpected error: {str(e)}")
        logger.error(f"Unexpected error analyzing image: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Unexpected Error",
                "details": f"An unexpected error occurred: {str(e)}. Please try again or contact support if the issue persists.",
                "logs": error_logs,
            },
        )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
