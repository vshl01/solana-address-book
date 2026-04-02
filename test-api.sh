#!/bin/bash

# Comprehensive API Test Script for Solana Address Book
# Tests 30+ critical edge cases

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Test helper function
run_test() {
  test_count=$((test_count + 1))
  local test_name="$1"
  local expected_status="$2"
  local method="$3"
  local endpoint="$4"
  local data="$5"
  
  echo -e "\n--- Test $test_count: $test_name ---"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  echo "Expected: $expected_status | Got: $status"
  echo "Response: $body"
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    fail_count=$((fail_count + 1))
  fi
}

echo "======================================"
echo "Solana Address Book API Test Suite"
echo "======================================"

# Wait for server to be ready
sleep 1

# TEST SUITE 1: POST /api/contacts

# Valid wallet address (on-curve)
run_test "Add valid wallet contact" "201" "POST" "/api/contacts" \
  '{"name":"Alice","address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'

# Valid PDA address (off-curve) - Token program
run_test "Add valid PDA contact" "201" "POST" "/api/contacts" \
  '{"name":"Token Program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}'

# Missing name
run_test "Missing name field" "400" "POST" "/api/contacts" \
  '{"address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'

# Missing address
run_test "Missing address field" "400" "POST" "/api/contacts" \
  '{"name":"Bob"}'

# Empty name
run_test "Empty name" "400" "POST" "/api/contacts" \
  '{"name":"","address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'

# Whitespace-only name
run_test "Whitespace-only name" "400" "POST" "/api/contacts" \
  '{"name":"   ","address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'

# Invalid address (too short)
run_test "Invalid address - too short" "400" "POST" "/api/contacts" \
  '{"name":"Charlie","address":"invalid"}'

# Invalid address (not base58)
run_test "Invalid address - not base58" "400" "POST" "/api/contacts" \
  '{"name":"Dave","address":"000000000000000000000000000000000000000000000"}'

# Duplicate address
run_test "Duplicate address" "409" "POST" "/api/contacts" \
  '{"name":"Alice2","address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'

# Name with special characters
run_test "Name with special characters" "201" "POST" "/api/contacts" \
  '{"name":"Test-User_123!@#","address":"Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"}'

# TEST SUITE 2: GET /api/contacts

run_test "List all contacts" "200" "GET" "/api/contacts" ""

run_test "Filter by type=wallet" "200" "GET" "/api/contacts?type=wallet" ""

run_test "Filter by type=pda" "200" "GET" "/api/contacts?type=pda" ""

run_test "Invalid type filter" "400" "GET" "/api/contacts?type=invalid" ""

# TEST SUITE 3: GET /api/contacts/:id

run_test "Get contact by valid ID" "200" "GET" "/api/contacts/1" ""

run_test "Get contact by non-existent ID" "404" "GET" "/api/contacts/999" ""

run_test "Get contact by invalid ID (negative)" "404" "GET" "/api/contacts/-1" ""

run_test "Get contact by invalid ID (zero)" "404" "GET" "/api/contacts/0" ""

run_test "Get contact by invalid ID (string)" "404" "GET" "/api/contacts/abc" ""

# TEST SUITE 4: PUT /api/contacts/:id

run_test "Update contact name" "200" "PUT" "/api/contacts/1" \
  '{"name":"Alice Updated"}'

run_test "Update with missing name" "400" "PUT" "/api/contacts/1" '{}'

run_test "Update with empty name" "400" "PUT" "/api/contacts/1" \
  '{"name":""}'

run_test "Update non-existent contact" "404" "PUT" "/api/contacts/999" \
  '{"name":"Ghost"}'

# TEST SUITE 5: POST /api/contacts/:id/derive-ata

# Add a contact for ATA testing
run_test "Add contact for ATA" "201" "POST" "/api/contacts" \
  '{"name":"ATA Test","address":"7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM1QYCrVSzSY9"}'

run_test "Derive ATA with valid mint" "200" "POST" "/api/contacts/4/derive-ata" \
  '{"mintAddress":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}'

run_test "Derive ATA with missing mint" "400" "POST" "/api/contacts/4/derive-ata" '{}'

run_test "Derive ATA with invalid mint" "400" "POST" "/api/contacts/4/derive-ata" \
  '{"mintAddress":"invalid"}'

run_test "Derive ATA for non-existent contact" "404" "POST" "/api/contacts/999/derive-ata" \
  '{"mintAddress":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}'

# TEST SUITE 6: POST /api/verify-ownership

# Note: This uses a dummy signature - in production, you'd generate a real signature
run_test "Verify ownership with all fields" "200" "POST" "/api/verify-ownership" \
  '{"address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T","message":"Hello","signature":"5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJwgtYRtmJPzRv1wJcPk8YGBbMc8iFN8f9dYPnLw1NJ5g"}'

run_test "Verify with missing address" "400" "POST" "/api/verify-ownership" \
  '{"message":"Hello","signature":"5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJwgtYRtmJPzRv1wJcPk8YGBbMc8iFN8f9dYPnLw1NJ5g"}'

run_test "Verify with missing message" "400" "POST" "/api/verify-ownership" \
  '{"address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T","signature":"5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJwgtYRtmJPzRv1wJcPk8YGBbMc8iFN8f9dYPnLw1NJ5g"}'

run_test "Verify with missing signature" "400" "POST" "/api/verify-ownership" \
  '{"address":"4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T","message":"Hello"}'

run_test "Verify with invalid address" "400" "POST" "/api/verify-ownership" \
  '{"address":"invalid","message":"Hello","signature":"5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJwgtYRtmJPzRv1wJcPk8YGBbMc8iFN8f9dYPnLw1NJ5g"}'

# TEST SUITE 7: POST /api/derive-pda

run_test "Derive PDA with valid inputs" "200" "POST" "/api/derive-pda" \
  '{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","seeds":["metadata","treasury"]}'

run_test "Derive PDA with single seed" "200" "POST" "/api/derive-pda" \
  '{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","seeds":["vault"]}'

run_test "Derive PDA with missing programId" "400" "POST" "/api/derive-pda" \
  '{"seeds":["test"]}'

run_test "Derive PDA with missing seeds" "400" "POST" "/api/derive-pda" \
  '{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}'

run_test "Derive PDA with empty seeds array" "400" "POST" "/api/derive-pda" \
  '{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","seeds":[]}'

run_test "Derive PDA with invalid programId" "400" "POST" "/api/derive-pda" \
  '{"programId":"invalid","seeds":["test"]}'

run_test "Derive PDA with seed > 32 bytes" "400" "POST" "/api/derive-pda" \
  '{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","seeds":["this_is_a_very_long_seed_that_exceeds_the_maximum_allowed_length_of_32_bytes"]}'

# TEST SUITE 8: DELETE /api/contacts/:id

run_test "Delete existing contact" "200" "DELETE" "/api/contacts/3" ""

run_test "Delete non-existent contact" "404" "DELETE" "/api/contacts/999" ""

run_test "Delete already deleted contact" "404" "DELETE" "/api/contacts/3" ""

# Final Summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Total Tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo "======================================"

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
