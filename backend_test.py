import requests
import sys
import json
from datetime import datetime

class LeagueRankingAPITester:
    def __init__(self, base_url="https://league-rank-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.summoner_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success and response.get('status') == 'ok'

    def test_add_summoner(self, riot_id="Lorian#BIS"):
        """Test adding a summoner"""
        success, response = self.run_test(
            f"Add Summoner ({riot_id})",
            "POST",
            "api/summoners",
            200,
            data={"riot_id": riot_id}
        )
        if success and 'id' in response:
            self.summoner_id = response['id']
            print(f"   Summoner ID: {self.summoner_id}")
            return True, response
        return False, {}

    def test_list_summoners(self, refresh=True):
        """Test listing summoners"""
        success, response = self.run_test(
            f"List Summoners (refresh={refresh})",
            "GET",
            f"api/summoners?refresh={refresh}",
            200,
            timeout=60  # Longer timeout for Riot API calls
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} summoners")
            return True, response
        return False, []

    def test_get_summoner_detail(self, summoner_id, refresh=True):
        """Test getting summoner detail"""
        if not summoner_id:
            print("❌ No summoner ID available for detail test")
            return False, {}
            
        success, response = self.run_test(
            f"Get Summoner Detail (ID: {summoner_id})",
            "GET",
            f"api/summoners/{summoner_id}?refresh={refresh}",
            200,
            timeout=60  # Longer timeout for Riot API calls
        )
        return success, response

    def test_invalid_riot_id(self):
        """Test adding summoner with invalid Riot ID"""
        success, response = self.run_test(
            "Add Invalid Summoner (no #)",
            "POST",
            "api/summoners",
            400,
            data={"riot_id": "InvalidRiotID"}
        )
        return success

    def test_nonexistent_summoner(self):
        """Test adding non-existent summoner"""
        success, response = self.run_test(
            "Add Non-existent Summoner",
            "POST",
            "api/summoners",
            404,
            data={"riot_id": "NonExistentPlayer#9999"}
        )
        return success

    def validate_summoner_response(self, summoner_data):
        """Validate summoner response structure"""
        required_fields = [
            'id', 'riot_id', 'game_name', 'tag_line', 'current_lp', 
            'current_tier', 'current_rank', 'wins', 'losses', 
            'lp_gained', 'baseline_lp', 'baseline_set_at', 'updated_at'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in summoner_data:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ Missing fields in summoner response: {missing_fields}")
            return False
        
        print("✅ Summoner response structure is valid")
        return True

def main():
    print("🚀 Starting League Ranking API Tests")
    print("=" * 50)
    
    tester = LeagueRankingAPITester()
    
    # Test 1: Health Check
    if not tester.test_health_check():
        print("❌ Health check failed, stopping tests")
        return 1

    # Test 2: Add summoner (example: Lorian#BIS)
    success, summoner_data = tester.test_add_summoner("Lorian#BIS")
    if success:
        tester.validate_summoner_response(summoner_data)
    
    # Test 3: List summoners without refresh (faster)
    success, summoners_list = tester.test_list_summoners(refresh=False)
    if success and summoners_list:
        print(f"   Summoners in database: {len(summoners_list)}")
        for summoner in summoners_list[:3]:  # Show first 3
            print(f"   - {summoner.get('riot_id', 'Unknown')} (LP gained: {summoner.get('lp_gained', 0)})")

    # Test 4: Get summoner detail
    if tester.summoner_id:
        success, detail_data = tester.test_get_summoner_detail(tester.summoner_id, refresh=False)
        if success:
            tester.validate_summoner_response(detail_data)

    # Test 5: Error handling tests
    tester.test_invalid_riot_id()
    tester.test_nonexistent_summoner()

    # Test 6: List summoners with refresh (slower, tests Riot API integration)
    print(f"\n🔄 Testing Riot API integration (this may take longer)...")
    success, refreshed_summoners = tester.test_list_summoners(refresh=True)
    if success and refreshed_summoners:
        print("✅ Riot API integration working")
        # Show updated LP data
        for summoner in refreshed_summoners[:2]:
            print(f"   - {summoner.get('riot_id')}: {summoner.get('current_lp')} LP (gained: {summoner.get('lp_gained')})")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())