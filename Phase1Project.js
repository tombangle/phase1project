// index.js

const API_URL = 'https://www.themealdb.com/api/json/v1/1/random.php';

// Utility to get selected values
const getSelectedValues = (selector, attribute) => {
  const selected = document.querySelectorAll(`${selector}.selected`);
  return Array.from(selected).map(el => el.dataset[attribute]);
};

// Highlight selected boxes
document.addEventListener('DOMContentLoaded', () => {
  const selectableBoxes = document.querySelectorAll('.selectable-box');
  selectableBoxes.forEach(box => {
    box.addEventListener('click', () => {
      if (document.querySelectorAll('.selectable-box.selected').length < 7 || box.classList.contains('selected')) {
        box.classList.toggle('selected');
      } else {
        alert('You can select up to 7 meals.');
      }
    });
  });

  // Generate meal plan
  document.querySelector('#generate-plan').addEventListener('click', async () => {
    const userName = document.querySelector('#user-name').value;
    const meals = getSelectedValues('.selectable-box[data-meal]', 'meal');

    if (!userName || !meals.length) {
      alert('Please enter your name and select meals.');
      return;
    }

    const mealPlan = await fetchMealPlan(meals.length);
    displayMealPlan(mealPlan);
  });
});

// Fetch meal plan from TheMealDB API
const fetchMealPlan = async (numberOfMeals) => {
  try {
    const allMeals = [];
    for (let i = 0; i < numberOfMeals; i++) {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (data.meals) {
        allMeals.push(data.meals[0]);
      }
    }
    return allMeals;
  } catch (error) {
    console.error('Error fetching meals:', error);
    alert('Error fetching meals. Please try again later.');
    return [];
  }
};

// Display meal plan
const displayMealPlan = (recipes) => {
  const recipeList = document.querySelector('#recipe-list');
  const instructionsSection = document.querySelector('#instructions');
  const instructionsHeader = document.querySelector('#instructions-header');
  recipeList.innerHTML = '';
  instructionsSection.innerHTML = '';
  instructionsHeader.style.display = 'none'; // Hide the header initially

  recipes.forEach((recipe, index) => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = recipe.strMealThumb;
    img.alt = recipe.strMeal;
    img.style.width = '100px';
    img.style.marginRight = '10px';

    const detailsButton = document.createElement('button');
    detailsButton.textContent = 'View Instructions';
    detailsButton.classList.add('details-button');
    detailsButton.addEventListener('click', async () => {
      const recipeDetails = await fetchRecipeDetails(recipe.idMeal);
      displayInstructionsAndIngredients(recipeDetails);
      instructionsHeader.style.display = 'block'; // Show the header when the button is clicked
    });

    const printButton = document.createElement('button');
    printButton.textContent = 'Generate PDF';
    printButton.classList.add('print-button');
    printButton.addEventListener('click', async () => {
      const recipeDetails = await fetchRecipeDetails(recipe.idMeal);
      generatePDF(recipe, recipeDetails);
    });

    li.textContent = `Meal ${index + 1}: ${recipe.strMeal}`;
    li.prepend(img);
    li.appendChild(detailsButton);
    li.appendChild(printButton);
    recipeList.appendChild(li);
  });
};

// Display instructions and ingredients
const displayInstructionsAndIngredients = (recipeDetails) => {
  const instructionsSection = document.querySelector('#instructions');
  instructionsSection.innerHTML = ''; // Clear previous instructions

  const ingredientsList = document.createElement('ul');
  const ingredients = getIngredients(recipeDetails);
  ingredients.forEach(ingredient => {
    const li = document.createElement('li');
    li.textContent = ingredient;
    ingredientsList.appendChild(li);
  });

  const instructionsList = document.createElement('ul');
  recipeDetails.strInstructions.split('. ').forEach(step => {
    if (step.trim()) {
      const instructionLi = document.createElement('li');
      instructionLi.textContent = step.trim();
      instructionsList.appendChild(instructionLi);
    }
  });

  instructionsSection.appendChild(document.createElement('h3')).textContent = 'Ingredients';
  instructionsSection.appendChild(ingredientsList);
  instructionsSection.appendChild(document.createElement('h3')).textContent = 'Cooking Instructions';
  instructionsSection.appendChild(instructionsList);
};

const generatePDF = (recipe, recipeDetails) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add meal image
  const img = new Image();
  img.src = recipe.strMealThumb;
  img.crossOrigin = 'Anonymous';

  img.onload = () => {
    doc.addImage(img, 'JPEG', 10, 10, 50, 50);

    // Add meal name
    doc.setFontSize(16);
    doc.text(recipe.strMeal, 70, 20);

    // Add ingredients with word wrapping
    doc.setFontSize(12);
    doc.text('Ingredients:', 10, 70);
    const ingredients = getIngredients(recipeDetails);
    let yOffset = 80;
    ingredients.forEach(ingredient => {
      const textLines = doc.splitTextToSize(`- ${ingredient}`, 180); // Wrap text within 180mm
      textLines.forEach(line => {
        if (yOffset > 270) { // Check for page overflow
          doc.addPage();
          yOffset = 10;
        }
        doc.text(line, 10, yOffset);
        yOffset += 10;
      });
    });

    // Add cooking instructions with word wrapping and correct numbering
    doc.text('Cooking Instructions:', 10, yOffset + 10);
    yOffset += 20;
    const instructions = recipeDetails.strInstructions.split('. ');
    let stepNumber = 1; // Initialize step number
    instructions.forEach(step => {
      const textLines = doc.splitTextToSize(`${stepNumber}. ${step.trim()}`, 180); // Wrap text within 180mm
      textLines.forEach(line => {
        if (yOffset > 270) { // Check for page overflow
          doc.addPage();
          yOffset = 10;
        }
        doc.text(line, 10, yOffset);
        yOffset += 10;
      });
      stepNumber++; // Increment step number after processing each step
    });

    // Save the PDF
    doc.save(`${recipe.strMeal}.pdf`);
  };

  img.onerror = () => {
    console.error('Error loading image for PDF');
    alert('Unable to load image for the PDF.');
  };
};

// Fetch detailed recipe information
const fetchRecipeDetails = async (id) => {
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
  const data = await response.json();
  return data.meals[0];
};

// Get ingredients from recipe details
const getIngredients = (recipe) => {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure} ${ingredient}`.trim());
    }
  }
  return ingredients;
};