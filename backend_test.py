#!/usr/bin/env python3
"""
Backend API Testing for Scam Detection App
Tests the FastAPI backend endpoints for scam detection functionality.
"""

import requests
import json
import base64
from io import BytesIO
from PIL import Image
import os
import sys

# Get backend URL from environment
BACKEND_URL = "https://phishguard-40.preview.emergentagent.com/api"

def create_test_image_base64():
    """Create a simple test image and return as base64 string"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        # Create a 400x300 white image with some text that looks like an email
        img = Image.new('RGB', (400, 300), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.load_default()
        except:
            font = None
        
        # Add some email-like text
        email_text = [
            "From: support@bank.com",
            "Subject: Urgent Account Verification",
            "",
            "Dear Customer,",
            "",
            "Your account will be suspended unless",
            "you verify your information immediately.",
            "",
            "Click here to verify: www.fake-bank.com",
            "",
            "Thank you,",
            "Bank Security Team"
        ]
        
        y_position = 20
        for line in email_text:
            draw.text((20, y_position), line, fill='black', font=font)
            y_position += 20
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')
    except Exception as e:
        print(f"Error creating test image: {e}")
        # Fallback to simple colored rectangle
        img = Image.new('RGB', (100, 100), color='red')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')

def test_health_check():
    """Test the health check endpoint GET /api/"""
    print("🔍 Testing Health Check Endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "Scam Detection API" in data["message"]:
                print("✅ Health check endpoint working correctly")
                return True
            else:
                print("❌ Health check response format incorrect")
                return False
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed with error: {e}")
        return False

def test_analyze_valid_request():
    """Test the analyze endpoint with valid request"""
    print("\n🔍 Testing Analyze Endpoint - Valid Request...")
    try:
        # Create test image
        test_image_b64 = create_test_image_base64()
        
        payload = {
            "image_base64": test_image_b64
        }
        
        response = requests.post(
            f"{BACKEND_URL}/analyze",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
            
            # Validate response structure
            required_fields = ["score", "risk_level", "indicators", "summary"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            
            # Validate score range
            score = data.get("score")
            if not isinstance(score, int) or score < 0 or score > 100:
                print(f"❌ Invalid score: {score} (should be integer 0-100)")
                return False
            
            # Validate risk_level
            risk_level = data.get("risk_level")
            valid_risk_levels = ["safe", "suspicious", "scam"]
            if risk_level not in valid_risk_levels:
                print(f"❌ Invalid risk_level: {risk_level} (should be one of {valid_risk_levels})")
                return False
            
            # Validate indicators
            indicators = data.get("indicators", [])
            if not isinstance(indicators, list):
                print(f"❌ Indicators should be a list, got {type(indicators)}")
                return False
            
            for i, indicator in enumerate(indicators):
                required_indicator_fields = ["title", "explanation", "severity"]
                missing_indicator_fields = [field for field in required_indicator_fields if field not in indicator]
                if missing_indicator_fields:
                    print(f"❌ Indicator {i} missing fields: {missing_indicator_fields}")
                    return False
                
                # Validate severity
                severity = indicator.get("severity")
                valid_severities = ["low", "medium", "high"]
                if severity not in valid_severities:
                    print(f"❌ Invalid severity in indicator {i}: {severity}")
                    return False
            
            # Validate summary
            summary = data.get("summary")
            if not isinstance(summary, str) or len(summary.strip()) == 0:
                print(f"❌ Invalid summary: should be non-empty string")
                return False
            
            print("✅ Analyze endpoint working correctly")
            print(f"   Score: {score}")
            print(f"   Risk Level: {risk_level}")
            print(f"   Indicators Count: {len(indicators)}")
            print(f"   Summary Length: {len(summary)} chars")
            return True
            
        else:
            print(f"❌ Analyze endpoint failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Error response text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Analyze endpoint failed with error: {e}")
        return False

def test_analyze_empty_request():
    """Test analyze endpoint with empty request body"""
    print("\n🔍 Testing Analyze Endpoint - Empty Request...")
    try:
        response = requests.post(
            f"{BACKEND_URL}/analyze",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 422:  # FastAPI validation error
            print("✅ Empty request properly rejected with 422")
            return True
        else:
            print(f"❌ Expected 422 for empty request, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Empty request test failed with error: {e}")
        return False

def test_analyze_invalid_json():
    """Test analyze endpoint with invalid JSON"""
    print("\n🔍 Testing Analyze Endpoint - Invalid JSON...")
    try:
        response = requests.post(
            f"{BACKEND_URL}/analyze",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code in [400, 422]:  # Bad request or validation error
            print("✅ Invalid JSON properly rejected")
            return True
        else:
            print(f"❌ Expected 400/422 for invalid JSON, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Invalid JSON test failed with error: {e}")
        return False

def test_analyze_missing_image_field():
    """Test analyze endpoint with missing image_base64 field"""
    print("\n🔍 Testing Analyze Endpoint - Missing Image Field...")
    try:
        payload = {
            "wrong_field": "some_value"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/analyze",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 422:  # FastAPI validation error
            print("✅ Missing image field properly rejected with 422")
            return True
        else:
            print(f"❌ Expected 422 for missing field, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Missing field test failed with error: {e}")
        return False

def test_analyze_invalid_base64():
    """Test analyze endpoint with invalid base64 data"""
    print("\n🔍 Testing Analyze Endpoint - Invalid Base64...")
    try:
        payload = {
            "image_base64": "invalid_base64_data!!!"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/analyze",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code in [400, 422, 500]:  # Should be rejected
            print("✅ Invalid base64 properly rejected")
            return True
        else:
            print(f"❌ Expected error for invalid base64, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Invalid base64 test failed with error: {e}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("=" * 60)
    print("🚀 STARTING SCAM DETECTION BACKEND API TESTS")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    
    tests = [
        ("Health Check", test_health_check),
        ("Analyze - Valid Request", test_analyze_valid_request),
        ("Analyze - Empty Request", test_analyze_empty_request),
        ("Analyze - Invalid JSON", test_analyze_invalid_json),
        ("Analyze - Missing Image Field", test_analyze_missing_image_field),
        ("Analyze - Invalid Base64", test_analyze_invalid_base64),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        return True
    else:
        print(f"\n⚠️  {failed} TESTS FAILED")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)