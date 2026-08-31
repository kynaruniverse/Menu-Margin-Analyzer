const dishList = document.getElementById("dishList");
const addDishBtn = document.getElementById("addDishBtn");

const sampleMenuBtn = document.getElementById("sampleMenuBtn");
const importCsvBtn = document.getElementById("importCsvBtn");
const csvFileInput = document.getElementById("csvFileInput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearMenuBtn = document.getElementById("clearMenuBtn");
const printReportBtn = document.getElementById("printReportBtn");

const howItWorksBtn = document.getElementById("howItWorksBtn");
const onboardingModal = document.getElementById("onboardingModal");
const onboardingSampleBtn = document.getElementById("onboardingSampleBtn");
const onboardingStartBtn = document.getElementById("onboardingStartBtn");

const ONBOARDING_KEY = "mma_onboarded_v1";

const totalRevenueEl = document.getElementById("totalRevenue");
const totalIngredientCostEl = document.getElementById("totalIngredientCost");
const totalGrossProfitEl = document.getElementById("totalGrossProfit");
const overallFoodCostEl = document.getElementById("overallFoodCost");
const averageUnitsSoldEl = document.getElementById("averageUnitsSold");
const averageMarginEl = document.getElementById("averageMargin");
const averageProfitPerSaleEl = document.getElementById("averageProfitPerSale");
const averageTotalProfitEl = document.getElementById("averageTotalProfit");

const STORAGE_KEY = "mma_menu_v1";

const CURRENCY_LOCALE = "en-GB"; // change these two lines to sell in another market
const CURRENCY_CODE = "GBP";

const MAX_CSV_IMPORT_ROWS = 500;

let dishes = [];

/* --------------------------------
   STORAGE
-------------------------------- */

function saveDishes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
  } catch (error) {
    // Storage unavailable (private browsing, quota, etc.) — fail silently.
  }
}

function loadDishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      dishes = parsed;
    }
  } catch (error) {
    // Ignore corrupted storage and start fresh.
  }
}

/* --------------------------------
   CREATE DISH
-------------------------------- */

function createDish() {
  const dish = {
    id: Date.now(),
    name: "",
    sellingPrice: 0,
    ingredientCost: 0,
    unitsSold: 0,
    confirmed: false,
    editing: false,
    saved: null
  };

  dishes.push(dish);

  render();

  focusDishName(dish.id);
}

/* --------------------------------
   CONFIRM DISH
-------------------------------- */

function confirmDish(dishId) {
  const dish = dishes.find(item => item.id === dishId);

  if (!dish) {
    return;
  }

  const errors = validateDish(dish);

  if (!dish.name.trim()) {
    errors.push("Dish name is required.");
  }

  if (errors.length > 0) {
    const card = document.querySelector(`[data-id="${dishId}"]`);

    if (card) {
      const existingError = card.querySelector(".dish-error");
      const message = errors.join(" ");

      if (existingError) {
        existingError.textContent = message;
      } else {
        const error = document.createElement("div");

        error.className = "dish-error";
        error.textContent = message;

        card.appendChild(error);
      }
    }

    return;
  }

  dish.saved = {
    name: dish.name,
    sellingPrice: dish.sellingPrice,
    ingredientCost: dish.ingredientCost,
    unitsSold: dish.unitsSold
  };

  dish.confirmed = true;
  dish.editing = false;

  render();
}

/* --------------------------------
   EDIT DISH
-------------------------------- */

function editDish(dishId) {
  const dish = dishes.find(item => item.id === dishId);

  if (!dish) {
    return;
  }

  dish.editing = true;

  render();

  setTimeout(() => {
    const input = document.querySelector(
      `[data-id="${dishId}"] [data-field="name"]`
    );

    if (input) {
      input.focus();
    }
  }, 50);
}

/* --------------------------------
   FOCUS NEW DISH
-------------------------------- */

function focusDishName(dishId) {
  setTimeout(() => {
    const input = document.querySelector(
      `[data-id="${dishId}"] [data-field="name"]`
    );

    if (input) {
      input.focus();
    }
  }, 50);
}

/* --------------------------------
   DELETE DISH
-------------------------------- */

function deleteDish(dishId) {
  dishes = dishes.filter(dish => dish.id !== dishId);

  render();
}

/* --------------------------------
   VALIDATE DISH
-------------------------------- */

function validateDish(dish) {
  const errors = [];

  if (dish.sellingPrice < 0 || !Number.isFinite(dish.sellingPrice)) {
    errors.push("Selling price must be zero or greater.");
  }

  if (dish.ingredientCost < 0 || !Number.isFinite(dish.ingredientCost)) {
    errors.push("Ingredient cost must be zero or greater.");
  }

  if (dish.unitsSold < 0 || !Number.isFinite(dish.unitsSold)) {
    errors.push("Units sold must be zero or greater.");
  }

  if (!Number.isInteger(dish.unitsSold)) {
    errors.push("Units sold must be a whole number.");
  }

  return errors;
}

/* --------------------------------
   CALCULATE DISH
-------------------------------- */

function calculateDish(dish) {
  const sellingPrice = Number.isFinite(dish.sellingPrice)
    ? dish.sellingPrice
    : 0;

  const ingredientCost = Number.isFinite(dish.ingredientCost)
    ? dish.ingredientCost
    : 0;

  const unitsSold = Number.isFinite(dish.unitsSold)
    ? Math.max(0, Math.floor(dish.unitsSold))
    : 0;

  const revenue = sellingPrice * unitsSold;

  const totalIngredientCost = ingredientCost * unitsSold;

  const grossProfit = sellingPrice - ingredientCost;

  const foodCostPercent =
    sellingPrice > 0
      ? (ingredientCost / sellingPrice) * 100
      : 0;

  const grossMarginPercent =
    sellingPrice > 0
      ? (grossProfit / sellingPrice) * 100
      : 0;

  const totalGrossProfit = grossProfit * unitsSold;

  const warnings = [];

  if (sellingPrice > 0 && ingredientCost > sellingPrice) {
    warnings.push("Ingredient cost is higher than selling price.");
  }

  if (sellingPrice === 0 && unitsSold > 0) {
    warnings.push("Selling price is zero.");
  }

  return {
    ...dish,
    sellingPrice,
    ingredientCost,
    unitsSold,
    revenue,
    totalIngredientCost,
    grossProfit,
    foodCostPercent,
    grossMarginPercent,
    totalGrossProfit,
    warnings
  };
}

/* --------------------------------
   CALCULATE MENU
-------------------------------- */

function calculateMenu() {
  const activeDishes = dishes.filter(dish => dish.confirmed && dish.saved);

  const calculatedDishes = activeDishes.map(dish =>
    calculateDish({
      id: dish.id,
      name: dish.saved.name,
      sellingPrice: dish.saved.sellingPrice,
      ingredientCost: dish.saved.ingredientCost,
      unitsSold: dish.saved.unitsSold
    })
  );

  const validDishes = calculatedDishes.filter(
    dish => validateDish(dish).length === 0
  );

  const totalRevenue = validDishes.reduce(
    (sum, dish) => sum + dish.revenue,
    0
  );

  const totalIngredientCost = validDishes.reduce(
    (sum, dish) => sum + dish.totalIngredientCost,
    0
  );

  const totalGrossProfit = validDishes.reduce(
    (sum, dish) => sum + dish.totalGrossProfit,
    0
  );

  const totalUnits = validDishes.reduce(
    (sum, dish) => sum + dish.unitsSold,
    0
  );

  const overallFoodCost =
    totalRevenue > 0 ? (totalIngredientCost / totalRevenue) * 100 : 0;

  const overallGrossMargin =
    totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const averageSellingPrice =
    totalUnits > 0 ? totalRevenue / totalUnits : 0;

  const averageIngredientCost =
    totalUnits > 0 ? totalIngredientCost / totalUnits : 0;

  const averageGrossProfit =
    totalUnits > 0 ? totalGrossProfit / totalUnits : 0;

  const dishCount = validDishes.length;

  const averageUnitsSold =
    dishCount > 0
      ? validDishes.reduce((sum, dish) => sum + dish.unitsSold, 0) /
        dishCount
      : 0;

  const averageMargin =
    dishCount > 0
      ? validDishes.reduce(
          (sum, dish) => sum + dish.grossMarginPercent,
          0
        ) / dishCount
      : 0;

  const averageTotalProfit =
    dishCount > 0
      ? validDishes.reduce(
          (sum, dish) => sum + dish.totalGrossProfit,
          0
        ) / dishCount
      : 0;

  return {
    totalRevenue,
    totalIngredientCost,
    totalGrossProfit,
    totalUnits,
    overallFoodCost,
    overallGrossMargin,
    averageSellingPrice,
    averageIngredientCost,
    averageGrossProfit,
    averageUnitsSold,
    averageMargin,
    averageTotalProfit,
    dishCount,
    calculatedDishes
  };
}

/* --------------------------------
   PERFORMANCE SCORES
-------------------------------- */

function calculatePerformanceScores(dish, menu) {
  const salesScore =
    menu.averageUnitsSold > 0 ? dish.unitsSold / menu.averageUnitsSold : 0;

  const marginScore =
    menu.averageMargin > 0
      ? dish.grossMarginPercent / menu.averageMargin
      : 0;

  return {
    salesScore,
    marginScore,
    salesPercent: salesScore * 100,
    marginPercent: marginScore * 100
  };
}

/* --------------------------------
   CATEGORISE DISH
-------------------------------- */

function categorizeDish(dish, menu) {
  if (menu.dishCount < 2) {
    return {
      code: "unranked",
      label: "Add another dish to compare",
      icon: "—"
    };
  }

  const highSales = dish.unitsSold >= menu.averageUnitsSold;
  const highMargin = dish.grossMarginPercent >= menu.averageMargin;

  if (highSales && highMargin) {
    return { code: "star", label: "Star", icon: "⭐" };
  }

  if (!highSales && highMargin) {
    return { code: "potential", label: "Potential", icon: "🟡" };
  }

  if (highSales && !highMargin) {
    return { code: "fix", label: "Fix", icon: "🔴" };
  }

  return { code: "investigate", label: "Investigate", icon: "⚫" };
}

/* --------------------------------
   CALCULATE OPPORTUNITY
-------------------------------- */

function calculateOpportunity(dish, menu) {
  if (menu.dishCount === 0 || dish.sellingPrice <= 0 || dish.unitsSold <= 0) {
    return null;
  }

  if (dish.foodCostPercent <= menu.overallFoodCost) {
    return null;
  }

  const benchmarkIngredientCost =
    dish.sellingPrice * (menu.overallFoodCost / 100);

  const savingPerSale =
    dish.ingredientCost - benchmarkIngredientCost;

  if (savingPerSale <= 0) {
    return null;
  }

  const monthlyImprovement = savingPerSale * dish.unitsSold;

  return {
    dishName: dish.name,
    foodCostPercent: dish.foodCostPercent,
    benchmarkFoodCostPercent: menu.overallFoodCost,
    unitsSold: dish.unitsSold,
    monthlyImprovement,
    annualImprovement: monthlyImprovement * 12
  };
}

/* --------------------------------
   BIGGEST OPPORTUNITY
-------------------------------- */

function findBiggestOpportunity(menu) {
  const opportunities = menu.calculatedDishes
    .map(dish => calculateOpportunity(dish, menu))
    .filter(Boolean);

  if (opportunities.length === 0) {
    return null;
  }

  return opportunities.reduce((biggest, current) =>
    current.monthlyImprovement > biggest.monthlyImprovement
      ? current
      : biggest
  );
}

/* --------------------------------
   FORMAT CURRENCY
-------------------------------- */

function formatCurrency(value) {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/* --------------------------------
   RENDER
-------------------------------- */

function render() {
  saveDishes();

  dishList.innerHTML = "";

  const menu = calculateMenu();

  if (dishes.length === 0) {
    dishList.innerHTML = `
            <div class="empty-state">
                <strong>
                    Your menu is empty.
                </strong>
                <span>
                    Add your first dish to begin analysing your menu.
                </span>
            </div>
        `;
  }

    dishes.forEach(dish => {
    const analyticalDish = dish.confirmed && dish.saved
      ? calculateDish({
          id: dish.id,
          name: dish.saved.name,
          sellingPrice: dish.saved.sellingPrice,
          ingredientCost: dish.saved.ingredientCost,
          unitsSold: dish.saved.unitsSold
        })
      : calculateDish(dish);

    const scores = dish.confirmed
      ? calculatePerformanceScores(
          analyticalDish,
          menu
        )
      : {
          salesPercent: 0,
          marginPercent: 0
        };

    const category = dish.confirmed
      ? categorizeDish(analyticalDish, menu)
      : null;

    const errors = validateDish(dish);

    const card = document.createElement("div");

    card.className = dish.confirmed ? "dish-card" : "dish-card dish-draft";
    card.dataset.id = dish.id;

    const inputsDisabled = dish.confirmed && !dish.editing;

    card.innerHTML = `
            <div class="field">
                <label>Dish</label>
                <input
                    type="text"
                    placeholder="e.g. Chicken Burger"
                    value="${escapeHtml(dish.name)}"
                    data-field="name"
                    ${inputsDisabled ? "disabled" : ""}
                >
            </div>

            <div class="field">
                <label>Selling price</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="15.00"
                    value="${dish.sellingPrice || ""}"
                    data-field="sellingPrice"
                    ${inputsDisabled ? "disabled" : ""}
                >
            </div>

            <div class="field">
                <label>Ingredient cost</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="5.20"
                    value="${dish.ingredientCost || ""}"
                    data-field="ingredientCost"
                    ${inputsDisabled ? "disabled" : ""}
                >
            </div>

            <div class="field">
                <label>Units sold</label>
                <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    placeholder="420"
                    value="${dish.unitsSold || ""}"
                    data-field="unitsSold"
                    ${inputsDisabled ? "disabled" : ""}
                >
            </div>

            <div class="dish-actions">
                ${
                  dish.confirmed
                    ? dish.editing
                      ? `
                                    <button
                                        class="confirm-dish"
                                        type="button"
                                        data-confirm="${dish.id}"
                                    >
                                        Confirm changes
                                    </button>
                                `
                      : `
                                    <button
                                        class="edit-dish"
                                        type="button"
                                        data-edit="${dish.id}"
                                    >
                                        Edit
                                    </button>
                                `
                    : `
                            <button
                                class="confirm-dish"
                                type="button"
                                data-confirm="${dish.id}"
                            >
                                Confirm dish
                            </button>
                        `
                }

                <button
                    class="delete-dish"
                    type="button"
                    data-delete="${dish.id}"
                    aria-label="Delete ${escapeHtml(dish.name || "dish")}"
                >
                    Remove
                </button>
            </div>

            ${
              category
                ? `
                        <div class="category-badge category-${category.code}">
                            <span>${category.icon}</span>
                            ${category.label}
                        </div>
                    `
                : ""
            }

            <div class="dish-metrics">
                ${
                  dish.confirmed
                    ? `
                            <div class="metric">
                                <span>
                                    Gross profit
                                </span>
                                <strong>
                                    ${formatCurrency(analyticalDish.grossProfit)}
                                </strong>
                                <small>
                                    per sale
                                </small>
                            </div>

                            <div class="metric">
                                <span>
                                    Margin
                                </span>
                                <strong>
                                    ${analyticalDish.grossMarginPercent.toFixed(1)}%
                                </strong>
                                <small>
                                    gross margin
                                </small>
                            </div>

                            <div class="metric">
                                <span>
                                    Food cost
                                </span>
                                <strong>
                                    ${analyticalDish.foodCostPercent.toFixed(1)}%
                                </strong>
                                <small>
                                    of selling price
                                </small>
                            </div>

                            <div class="metric metric-total">
                                <span>
                                    Total gross profit
                                </span>
                                <strong>
                                    ${formatCurrency(analyticalDish.totalGrossProfit)}
                                </strong>
                                <small>
                                    across ${dish.unitsSold || 0}
                                    sale${dish.unitsSold === 1 ? "" : "s"}
                                </small>
                            </div>
                        `
                    : `
                            <div class="draft-message">
                                <strong>
                                    Draft dish
                                </strong>
                                <span>
                                    Complete the details and confirm this dish to include it in your menu analysis.
                                </span>
                            </div>
                        `
                }
            </div>

            ${
              dish.confirmed
                ? `
                        <div class="performance-panel">
                            <div class="performance-title">
                                Relative performance
                            </div>

                            <div class="performance-grid">
                                <div class="performance-item">
                                    <span>
                                        Sales vs menu
                                    </span>
                                    <strong>
                                        ${scores.salesPercent.toFixed(0)}%
                                    </strong>
                                    <small>
                                        of average
                                    </small>
                                </div>

                                <div class="performance-item">
                                    <span>
                                        Margin vs menu
                                    </span>
                                    <strong>
                                        ${scores.marginPercent.toFixed(0)}%
                                    </strong>
                                    <small>
                                        of average
                                    </small>
                                </div>
                            </div>
                        </div>
                    `
                : ""
            }

            ${
              analyticalDish.warnings.length > 0
                ? `
                        <div class="dish-warning">
                            ⚠ ${analyticalDish.warnings.join(" ")}
                        </div>
                    `
                : ""
            }

            ${
              errors.length > 0
                ? `
                        <div class="dish-error">
                            ${errors.join(" ")}
                        </div>
                    `
                : ""
            }
        `;

    card.addEventListener("input", handleDishInput);

    const deleteButton = card.querySelector("[data-delete]");

    deleteButton.addEventListener("click", () => {
      deleteDish(dish.id);
    });

    const confirmButton = card.querySelector("[data-confirm]");

    if (confirmButton) {
      confirmButton.addEventListener("click", () => {
        confirmDish(dish.id);
      });
    }

    const editButton = card.querySelector("[data-edit]");

    if (editButton) {
      editButton.addEventListener("click", () => {
        editDish(dish.id);
      });
    }

    dishList.appendChild(card);
  });

  updateSummary();
}

/* --------------------------------
   HANDLE INPUT
-------------------------------- */

function handleDishInput(event) {
  const card = event.currentTarget;
  const dishId = Number(card.dataset.id);
  const field = event.target.dataset.field;

  if (!field) {
    return;
  }

  const dish = dishes.find(item => item.id === dishId);

  if (!dish) {
    return;
  }

  if (field === "name") {
    dish.name = event.target.value;
  } else {
    const value = Number(event.target.value);

    if (field === "unitsSold") {
      dish[field] = Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : 0;
    } else {
      dish[field] = Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
    }
  }

  updateDishMetrics(card, dish);

  updateSummary();
}

/* --------------------------------
   UPDATE DISH METRICS
-------------------------------- */

function updateDishMetrics(card, dish) {
  const calculated = calculateDish(dish);

  const metrics = card.querySelector(".dish-metrics");

  if (!metrics) {
    return;
  }

  if (!dish.confirmed) {
    updateDishMessages(card, dish);

    return;
  }

  const values = metrics.querySelectorAll("strong");

  if (values.length >= 4) {
    values[0].textContent = formatCurrency(calculated.grossProfit);
    values[1].textContent = `${calculated.grossMarginPercent.toFixed(1)}%`;
    values[2].textContent = `${calculated.foodCostPercent.toFixed(1)}%`;
    values[3].textContent = formatCurrency(calculated.totalGrossProfit);
  }

  const totalLabel = metrics.querySelector(".metric-total small");

  if (totalLabel) {
    const units = dish.unitsSold || 0;

    totalLabel.textContent = `across ${units} sale${units === 1 ? "" : "s"}`;
  }

  updateDishMessages(card, dish);
}

/* --------------------------------
   UPDATE DISH MESSAGES
-------------------------------- */

function updateDishMessages(card, dish) {
  if (!card) {
    return;
  }

  const calculated = calculateDish(dish);
  const errors = validateDish(dish);

  const existingWarning = card.querySelector(".dish-warning");
  const existingError = card.querySelector(".dish-error");

  if (calculated.warnings.length > 0) {
    const message = `⚠ ${calculated.warnings.join(" ")}`;

    if (existingWarning) {
      existingWarning.textContent = message;
    } else {
      const warning = document.createElement("div");

      warning.className = "dish-warning";
      warning.textContent = message;

      card.appendChild(warning);
    }
  } else {
    if (existingWarning) {
      existingWarning.remove();
    }
  }

  if (errors.length > 0) {
    const message = errors.join(" ");

    if (existingError) {
      existingError.textContent = message;
    } else {
      const error = document.createElement("div");

      error.className = "dish-error";
      error.textContent = message;

      card.appendChild(error);
    }
  } else {
    if (existingError) {
      existingError.remove();
    }
  }
}

/* --------------------------------
   UPDATE SUMMARY
-------------------------------- */

function updateSummary() {
  const menu = calculateMenu();

  updateOpportunityPanel(menu);

  totalRevenueEl.textContent = formatCurrency(menu.totalRevenue);
  totalIngredientCostEl.textContent = formatCurrency(
    menu.totalIngredientCost
  );
  totalGrossProfitEl.textContent = formatCurrency(menu.totalGrossProfit);
  overallFoodCostEl.textContent = `${menu.overallFoodCost.toFixed(1)}%`;
  averageUnitsSoldEl.textContent = menu.averageUnitsSold.toFixed(1);
  averageMarginEl.textContent = `${menu.averageMargin.toFixed(1)}%`;
  averageProfitPerSaleEl.textContent = formatCurrency(
    menu.averageGrossProfit
  );
  averageTotalProfitEl.textContent = formatCurrency(
    menu.averageTotalProfit
  );
}

/* --------------------------------
   UPDATE OPPORTUNITY PANEL
-------------------------------- */

function updateOpportunityPanel(menu) {
  const panel = document.getElementById("opportunityPanel");

  if (!panel) {
    return;
  }

  const opportunity = findBiggestOpportunity(menu);

  if (!opportunity) {
    panel.innerHTML = `
            <div class="benchmark-heading">
                <span>BIGGEST OPPORTUNITY</span>
            </div>
            <p class="opportunity-empty">
                No standout opportunity yet — confirm a few dishes to see where you're leaving money on the table.
            </p>
        `;

    return;
  }

  panel.innerHTML = `
        <div class="benchmark-heading">
            <span>BIGGEST OPPORTUNITY</span>
            <small>Largest opportunity above your menu food-cost benchmark</small>
        </div>
        <div class="opportunity-body">
            <strong>${escapeHtml(opportunity.dishName)}</strong>
            <div class="opportunity-stats">
                <div>
                    <span>Food cost</span>
                    <strong>${opportunity.foodCostPercent.toFixed(1)}%</strong>
                    <small>vs ${opportunity.benchmarkFoodCostPercent.toFixed(1)}% menu average</small>
                </div>
                <div>
                    <span>Monthly sales</span>
                    <strong>${opportunity.unitsSold}</strong>
                    <small>units</small>
                </div>
            </div>
            <div class="opportunity-improvement">
                <span>Potential improvement</span>
                <strong>${formatCurrency(opportunity.monthlyImprovement)}/month</strong>
                <small>${formatCurrency(opportunity.annualImprovement)}/year if brought in line with your average food cost</small>
            </div>
        </div>
    `;
}

/* --------------------------------
   SAMPLE MENU
-------------------------------- */

const SAMPLE_DISHES = [
  { name: "Chicken Burger", sellingPrice: 15.0, ingredientCost: 5.2, unitsSold: 420 },
  { name: "Fish & Chips", sellingPrice: 14.5, ingredientCost: 6.8, unitsSold: 260 },
  { name: "Veggie Curry", sellingPrice: 12.0, ingredientCost: 3.1, unitsSold: 90 },
  { name: "Ribeye Steak", sellingPrice: 26.0, ingredientCost: 11.5, unitsSold: 140 },
  { name: "Caesar Salad", sellingPrice: 9.5, ingredientCost: 2.2, unitsSold: 310 },
  { name: "Mushroom Risotto", sellingPrice: 13.5, ingredientCost: 4.0, unitsSold: 60 }
];

function loadSampleMenu() {
  if (dishes.length > 0) {
    const confirmed = window.confirm(
      "This will replace your current menu with sample data. Continue?"
    );

    if (!confirmed) {
      return;
    }
  }

  dishes = SAMPLE_DISHES.map((sample, index) =>
    buildConfirmedDish(sample, Date.now() + index)
  );

  render();
}

/* --------------------------------
   BUILD CONFIRMED DISH
-------------------------------- */

function buildConfirmedDish(values, id) {
  return {
    id,
    name: values.name,
    sellingPrice: values.sellingPrice,
    ingredientCost: values.ingredientCost,
    unitsSold: values.unitsSold,
    confirmed: true,
    editing: false,
    saved: {
      name: values.name,
      sellingPrice: values.sellingPrice,
      ingredientCost: values.ingredientCost,
      unitsSold: values.unitsSold
    }
  };
}

/* --------------------------------
   CLEAR MENU
-------------------------------- */

function clearMenu() {
  if (dishes.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    "This will remove every dish from your menu. Continue?"
  );

  if (!confirmed) {
    return;
  }

  dishes = [];

  render();
}

/* --------------------------------
   EXPORT CSV
-------------------------------- */

function exportCsv() {
  const confirmedDishes = dishes.filter(dish => dish.confirmed && dish.saved);

  if (confirmedDishes.length === 0) {
    window.alert("Confirm at least one dish before exporting.");

    return;
  }

  const rows = [
    ["Dish", "Selling Price", "Ingredient Cost", "Units Sold"],
    ...confirmedDishes.map(dish => [
      csvEscape(dish.saved.name),
      dish.saved.sellingPrice,
      dish.saved.ingredientCost,
      dish.saved.unitsSold
    ])
  ];

  const csvContent = rows.map(row => row.join(",")).join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "menu-margin-analyzer.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const stringValue = String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/* --------------------------------
   IMPORT CSV
-------------------------------- */

function importCsv(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const allRows = parseCsv(String(reader.result));

    if (allRows.length === 0) {
      window.alert("No dishes found in that file.");

      return;
    }

    const rows = allRows.slice(0, MAX_CSV_IMPORT_ROWS);
    const wasTruncated = allRows.length > rows.length;

    const imported = rows.map((row, index) =>
      buildConfirmedDish(row, Date.now() + index)
    );

    dishes = dishes.concat(imported);

    render();

    const summary = `Imported ${imported.length} dish${imported.length === 1 ? "" : "es"}.`;
    const truncationNote = wasTruncated
      ? ` Only the first ${MAX_CSV_IMPORT_ROWS} rows were imported — split larger menus into more than one file.`
      : "";

    window.alert(summary + truncationNote);
  };

  reader.onerror = () => {
    window.alert("Could not read that file.");
  };

  reader.readAsText(file);
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const rows = [];

  lines.forEach(line => {
    const cells = splitCsvLine(line);

    if (cells.length < 4) {
      return;
    }

    const [name, sellingPrice, ingredientCost, unitsSold] = cells;

    // Skip a header row like "Dish,Selling Price,..."
    if (isNaN(Number(sellingPrice))) {
      return;
    }

    const dish = {
      name: name.trim(),
      sellingPrice: Number(sellingPrice),
      ingredientCost: Number(ingredientCost),
      unitsSold: Number(unitsSold)
    };

    if (!dish.name || validateDish(dish).length > 0) {
      return;
    }

    rows.push(dish);
  });

  return rows;
}

function splitCsvLine(line) {
  const cells = [];

  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells;
}

/* --------------------------------
   ESCAPE HTML
-------------------------------- */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* --------------------------------
   ONBOARDING
-------------------------------- */

function hasSeenOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch (error) {
    // Storage unavailable — the modal will just reappear next visit.
  }
}

function openOnboarding() {
  if (!onboardingModal) {
    return;
  }

  onboardingModal.hidden = false;
}

function closeOnboarding() {
  if (!onboardingModal) {
    return;
  }

  onboardingModal.hidden = true;

  markOnboardingSeen();
}

/* --------------------------------
   EVENTS
-------------------------------- */

addDishBtn.addEventListener("click", createDish);

sampleMenuBtn.addEventListener("click", loadSampleMenu);

exportCsvBtn.addEventListener("click", exportCsv);

clearMenuBtn.addEventListener("click", clearMenu);

printReportBtn.addEventListener("click", () => {
  window.print();
});

importCsvBtn.addEventListener("click", () => {
  csvFileInput.click();
});

csvFileInput.addEventListener("change", event => {
  const file = event.target.files && event.target.files[0];

  if (file) {
    importCsv(file);
  }

  csvFileInput.value = "";
});

howItWorksBtn.addEventListener("click", openOnboarding);

onboardingSampleBtn.addEventListener("click", () => {
  closeOnboarding();
  loadSampleMenu();
});

onboardingStartBtn.addEventListener("click", () => {
  closeOnboarding();
});

/* --------------------------------
   INITIAL RENDER
-------------------------------- */

loadDishes();

render();

if (dishes.length === 0 && !hasSeenOnboarding()) {
  openOnboarding();
}
