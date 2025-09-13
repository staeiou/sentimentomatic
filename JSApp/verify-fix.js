// Verify the star parsing fix
function testStarParsing() {
  console.log('🧪 Testing star parsing logic...\n');
  
  const testLabels = [
    "1 star",
    "2 stars", 
    "3 stars",
    "4 stars",
    "5 stars"
  ];
  
  testLabels.forEach(label => {
    const starMatch = label.match(/(\d+)\s*stars?/i);
    if (starMatch) {
      const stars = parseInt(starMatch[1]);
      const score = (stars - 3) / 2; // Convert 1-5 stars to -1 to +1
      const sentiment = stars >= 4 ? 'positive' : (stars <= 2 ? 'negative' : 'neutral');
      
      console.log(`"${label}" → ${stars} stars → score ${score} (${sentiment})`);
    }
  });
  
  console.log('\n✅ Expected behavior:');
  console.log('1 star → -1.0 (very negative)');
  console.log('2 stars → -0.5 (negative)');  
  console.log('3 stars → 0.0 (neutral)');
  console.log('4 stars → +0.5 (positive)');
  console.log('5 stars → +1.0 (very positive)');
}

testStarParsing();