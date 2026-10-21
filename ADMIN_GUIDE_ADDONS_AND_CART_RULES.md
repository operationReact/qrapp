# Admin Guide: Add-ons and Cart Suggestions

This guide explains how to use two admin features: **Add-on options** for products, and **Cart Rules** for "you might also like" suggestions. No technical knowledge is needed.

---

## 1. Add-on options for a product

Use this to offer choices such as milk type, sugar level, or extra toppings, with optional extra prices.

**Where:** Admin sidebar → **Add-on Options** → click a product.

**Steps**
1. Select the product. Its add-on section appears below.
2. Click to create a **group**, for example "Milk choice" or "Extra toppings".
3. Add the **options** inside the group, for example "Oat milk (+₹30)".
4. Set the rule for the group:
   - **Pick one**: the customer must choose exactly one option (for example, milk type).
   - **Pick many**: the customer can choose several (for example, toppings).
   - **Required or optional**: whether the customer must make a choice.
5. Save. Customers will see the options when they tap the product in the menu.

**Tips**
- Keep group names short so they fit on the phone screen.
- To remove an option, you can turn it off rather than delete it, so past orders still make sense.

---

## 2. Cart Rules (cart suggestions)

Use this to suggest another product when a customer has something specific in their cart, with an optional discount.

**Where:** Admin sidebar → **Cart Rules**.

**A rule has three parts**
- **When** (the trigger): what the customer has in the cart.
  - a specific product
  - any product from a category (for example, "any drink")
  - a cart total above an amount
- **Offer** (the suggestion): what to suggest.
  - a specific product
  - any product from a category (the system picks the first available one not already in the cart)
- **Reward** (the discount): none, a fixed amount off, or a percentage off.

**Steps**
1. Click to create a new rule.
2. Choose the trigger and fill in the product, category, or amount.
3. Choose the offer and the discount.
4. Save, then turn the rule **on**.

**Meal Role (for "Complete Your Meal")**
- The "Complete Your Meal" box in the cart is driven by Cart Rules too. It replaces the old "Goes Well With" pairings.
- When the trigger is a **specific product** and the offer is a **specific product**, a **Meal Role** dropdown appears.
- Pick **Drink**, **Side**, **Dessert** or **Addon** to make that product a meal companion. Pick **Not a meal companion** for a normal suggestion.
- If several meal rules share a role for the same product, the one with the **highest priority number** is shown.
- Meal companions are not shown in the general "you might also like" suggestions.

**Example**
> When a customer adds **Cold Coffee**, suggest **any Bakery item** with **10% off**.

**Tips**
- If you want to pause a rule, turn it off rather than deleting it.
- The "any item from a category" option always picks the first matching item, so the same suggestion may appear often. Add more rules to vary it.

---

## 3. Checking that everything works

1. Open the customer menu and add a product that has add-ons. Confirm the options appear and the price updates.
2. Add the product that triggers a rule. Confirm the suggestion appears in the cart.
3. Go to checkout and confirm the total is correct.

**Before going live:** run these checks on a test copy of the system first. The newest database updates have not yet been tested on the live database.

---

## Need help?

If something looks wrong, note the product or rule name, what you expected, and what you saw, then share it with your technical contact.
