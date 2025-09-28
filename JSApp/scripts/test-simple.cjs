const { pipeline } = require("@huggingface/transformers");

async function testSentimentAnalysis() {
  try {
    console.log('Loading sentiment analysis pipeline...');

    // Create a sentiment analysis pipeline
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');

    console.log('Pipeline loaded successfully!');

    // 25 neutral sentences to test
    const neutralSentences = [
      "Each line will be analyzed independently and given scores by various models.",
      "The meeting is scheduled for 3 PM in conference room B.",
      "Please save your work before closing the application.",
      "The temperature today is 72 degrees Fahrenheit.",
      "This document contains information about our company policies.",
      "The train arrives at platform 2 in fifteen minutes.",
      "Click the blue button to proceed to the next step.",
      "The library is open from 9 AM to 6 PM on weekdays.",
      "There are three different options available for selection.",
      "The file has been uploaded to the shared folder.",
      "Enter your username and password to access the system.",
      "The report covers data from the last quarter.",
      "Students should complete the assignment by Friday.",
      "The package will be delivered between 10 AM and 2 PM.",
      "Follow the instructions provided in the user manual.",
      "The conference room can accommodate up to twenty people.",
      "Data is processed using machine learning algorithms.",
      "The form requires your full name and email address.",
      "Regular maintenance is performed every Tuesday evening.",
      "The website supports multiple languages and currencies.",
      "Press the red button to stop the recording.",
      "The event takes place annually in the spring season.",
      "This feature is available in the premium version only.",
      "The database contains records from 2010 to present.",
      "Participants must register before the deadline expires."
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let wrongClassifications = [];

    console.log('\n=== Testing 25 Neutral Sentences ===\n');

    for (let i = 0; i < neutralSentences.length; i++) {
      const sentence = neutralSentences[i];
      const result = await classifier(sentence);
      const prediction = result[0];

      console.log(`${i + 1}. "${sentence}"`);
      console.log(`   → ${prediction.label} (${(prediction.score * 100).toFixed(1)}%)\n`);

      if (prediction.label === 'POSITIVE') {
        positiveCount++;
      } else {
        negativeCount++;
        wrongClassifications.push({
          sentence,
          confidence: (prediction.score * 100).toFixed(1)
        });
      }
    }

    console.log('=== SUMMARY ===');
    console.log(`Total sentences: ${neutralSentences.length}`);
    console.log(`Classified as POSITIVE: ${positiveCount} (${((positiveCount / neutralSentences.length) * 100).toFixed(1)}%)`);
    console.log(`Classified as NEGATIVE: ${negativeCount} (${((negativeCount / neutralSentences.length) * 100).toFixed(1)}%)`);

    if (wrongClassifications.length > 0) {
      console.log('\n=== HIGH-CONFIDENCE NEGATIVE CLASSIFICATIONS ===');
      wrongClassifications
        .filter(item => parseFloat(item.confidence) > 70)
        .forEach(item => {
          console.log(`"${item.sentence}" → NEGATIVE (${item.confidence}%)`);
        });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testSentimentAnalysis();