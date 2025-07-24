#!/usr/bin/env bats

setup() {
  load "$E2E_HELPERS_PATH/bats_libraries"
  _load_bats_libraries
  MESHERYCTL_DIR=$(dirname "$MESHERYCTL_BIN")
  export TESTDATA_DIR="$MESHERYCTL_DIR/tests/e2e/002-model/testdata/model-generate"
  export FIXTURES_DIR="$BATS_TEST_DIRNAME/fixtures/model-generate"
  mkdir -p "$TEST_TEMP_DIR"
}

teardown() {
  rm -rf "$TEST_TEMP_DIR"
}

@test "mesheryctl model generate displays usage instructions when no arguments are provided" {
  run $MESHERYCTL_BIN model generate
  [ "$status" -ne 0 ]
  assert_output --partial "Error: [ file | filepath | URL ] isn't specified"
  assert_output --partial "Usage: mesheryctl model generate [ file | filePath | URL ]"
}

# @test "mesheryctl model generate handles invalid file path gracefully" {
#   run $MESHERYCTL_BIN model generate invalid/path/to/file
#   [ "$status" -ne 0 ]
#   assert_output --partial "no such file or directory"
# }

@test "mesheryctl model generate requires template for URL input" {
  run $MESHERYCTL_BIN model generate --file https://example.com/data
  [ "$status" -ne 0 ]
  assert_output --partial "no template file is provided"
}

@test "mesheryctl model generate works with URL and template" {

  run $MESHERYCTL_BIN model generate --file https://example.com/data --template $FIXTURES_DIR/template.json
  [ "$status" -eq 0 ]
  assert_output --partial "Model can be accessed from"
  assert_output --partial "$HOME/.meshery/models"
}

@test "mesheryctl model generate works with CSV directory" {
  # Create a minimal CSV directory structure
  csv_dir="$TEST_TEMP_DIR/csv_data"
  mkdir -p "$csv_dir"
  echo "model data" > "$csv_dir/model.csv"
  echo "component data" > "$csv_dir/component.csv"
  echo "relationship data" > "$csv_dir/relationship.csv"
  
  run $MESHERYCTL_BIN model generate --file "$csv_dir"
  [ "$status" -eq 0 ]
  assert_output --partial "Model can be accessed from"
  assert_output --partial "$HOME/.meshery/models"
  assert_output --partial "Logs for the csv generation can be accessed"
  assert_output --partial "$HOME/.meshery/logs/registry"
}

@test "mesheryctl model generate supports skip registration flag" {
  # Create a minimal valid template file
  template_file="$TEST_TEMP_DIR/template.json"
  echo '{"name": "test-model"}' > "$template_file"
  
  run $MESHERYCTL_BIN model generate --file https://example.com/data --template "$template_file" --register
  [ "$status" -eq 0 ]
  assert_output --partial "Model can be accessed from"
  assert_output --partial "$HOME/.meshery/models"
}