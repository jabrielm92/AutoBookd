"""
Test file for new features:
1. POST /api/conversations/manual - Manual email composition endpoint
2. SetupGuide component - Detailed integration guides (frontend test)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "jabriel@arisolutionsinc.com"
ADMIN_PASSWORD = "admin123"


class TestManualEmailEndpoint:
    """Tests for POST /api/conversations/manual endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_manual_email_requires_auth(self):
        """Test that manual email endpoint requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/conversations/manual", json={
            "to_email": "test@example.com",
            "subject": "Test Subject",
            "body": "Test body"
        })
        
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403, got {response.status_code}"
        print("PASS: Manual email endpoint requires authentication")
    
    def test_manual_email_validation_missing_fields(self):
        """Test validation - missing required fields"""
        # Missing to_email
        response = self.session.post(f"{BASE_URL}/api/conversations/manual", json={
            "subject": "Test Subject",
            "body": "Test body"
        })
        assert response.status_code == 422, f"Expected 422 for missing to_email, got {response.status_code}"
        print("PASS: Missing to_email returns 422")
        
        # Missing subject
        response = self.session.post(f"{BASE_URL}/api/conversations/manual", json={
            "to_email": "test@example.com",
            "body": "Test body"
        })
        assert response.status_code == 422, f"Expected 422 for missing subject, got {response.status_code}"
        print("PASS: Missing subject returns 422")
        
        # Missing body
        response = self.session.post(f"{BASE_URL}/api/conversations/manual", json={
            "to_email": "test@example.com",
            "subject": "Test Subject"
        })
        assert response.status_code == 422, f"Expected 422 for missing body, got {response.status_code}"
        print("PASS: Missing body returns 422")
    
    def test_manual_email_without_email_settings(self):
        """Test that endpoint returns error when email settings not configured"""
        # First, check current config
        config_response = self.session.get(f"{BASE_URL}/api/config")
        assert config_response.status_code == 200
        config = config_response.json()
        
        # If resend_api_key or from_email is not set, we expect 400 error
        has_resend_key = bool(config.get("resend_api_key"))
        has_from_email = bool(config.get("from_email"))
        
        response = self.session.post(f"{BASE_URL}/api/conversations/manual", json={
            "to_email": "test@example.com",
            "subject": "Test Subject",
            "body": "Test body content"
        })
        
        if not has_resend_key or not has_from_email:
            # Should return 400 with appropriate error message
            assert response.status_code == 400, \
                f"Expected 400 when email settings not configured, got {response.status_code}"
            error_detail = response.json().get("detail", "")
            assert "Resend" in error_detail or "email" in error_detail.lower(), \
                f"Error should mention email settings: {error_detail}"
            print(f"PASS: Returns 400 when email settings not configured: {error_detail}")
        else:
            # If settings are configured, it might succeed or fail based on actual Resend API
            # We just verify it doesn't return 422 (validation error)
            assert response.status_code != 422, \
                f"Should not return validation error when all fields provided"
            print(f"PASS: Endpoint processed request (status: {response.status_code})")
    
    def test_manual_email_with_optional_business_name(self):
        """Test that business_name is optional"""
        # This should not fail validation even without business_name
        response = self.session.post(f"{BASE_URL}/api/conversations/manual", json={
            "to_email": "test@example.com",
            "subject": "Test Subject",
            "body": "Test body content"
            # business_name is intentionally omitted
        })
        
        # Should not be 422 (validation error)
        assert response.status_code != 422, \
            f"business_name should be optional, got validation error: {response.text}"
        print(f"PASS: business_name is optional (status: {response.status_code})")


class TestConversationsEndpoint:
    """Tests for GET /api/conversations endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_conversations(self):
        """Test GET /api/conversations returns list"""
        response = self.session.get(f"{BASE_URL}/api/conversations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "data" in data, "Response should have 'data' field"
        assert isinstance(data["data"], list), "data should be a list"
        print(f"PASS: GET /api/conversations returns {len(data['data'])} conversations")


class TestSetupGuideIntegrations:
    """Tests to verify all integration guides are present in SetupGuide"""
    
    def test_setup_guide_file_exists(self):
        """Verify SetupGuide.jsx exists and contains all integration guides"""
        import os
        
        setup_guide_path = "/app/frontend/src/components/SetupGuide.jsx"
        assert os.path.exists(setup_guide_path), f"SetupGuide.jsx not found at {setup_guide_path}"
        
        with open(setup_guide_path, 'r') as f:
            content = f.read()
        
        # Check for all required integration guides
        required_integrations = [
            'serpapi',
            'hunter',
            'openai',
            'resend',
            'calendly',
            'apollo',
            'stripe',
            'autoreply'
        ]
        
        for integration in required_integrations:
            assert integration in content.lower(), \
                f"Integration guide for '{integration}' not found in SetupGuide.jsx"
            print(f"PASS: Found guide for {integration}")
        
        # Check for detailedGuides object
        assert 'detailedGuides' in content, "detailedGuides object not found"
        print("PASS: detailedGuides object found")
        
        # Check for setupSteps array
        assert 'setupSteps' in content, "setupSteps array not found"
        print("PASS: setupSteps array found")
        
        # Check for hasDetailedGuide property
        assert 'hasDetailedGuide' in content, "hasDetailedGuide property not found"
        print("PASS: hasDetailedGuide property found")


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected health status: {data}"
        print("PASS: Health endpoint returns healthy status")
    
    def test_login_endpoint(self):
        """Test login endpoint works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Login response should contain token"
        assert "user" in data, "Login response should contain user"
        print("PASS: Login endpoint works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
