document.addEventListener('DOMContentLoaded', () => {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-button');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });

    updateCartIconCount();
});

function handleAddToCart(event) {
    event.preventDefault();

    const button = event.target;
    const productItem = button.closest('.product-item, .product-item-category');

    if (!productItem) {
        console.error("Could not find product item container for button:", button);
        return;
    }

    const productId = productItem.dataset.id;
    const productName = productItem.dataset.name || 'Unknown Product';
    const productPrice = parseFloat(productItem.dataset.price);
    const productImage = productItem.dataset.image || 'https://via.placeholder.com/60x80';

    if (!productId || isNaN(productPrice)) {
        console.error("Missing essential product data (id or price) for item:", productItem);
        return;
    }

    const cart = readCart();
    const existingItemIndex = cart.findIndex(item => item.id === productId);

    addProductToCart(cart, existingItemIndex, {
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage,
        quantity: 1
    });

    showCartFeedback(productItem, productId);

    console.log('Current Cart:', cart);
    updateCartIconCount();
}

function updateCartIconCount() {
    const cart = readCart();
    const cartIcon = document.querySelector('.fa-shopping-cart');
    let totalItems = 0;
    cart.forEach(item => {
        totalItems += item.quantity;
    });

    const countElementId = 'cart-item-count';
    let countElement = document.getElementById(countElementId);

    if (!countElement && cartIcon) {
        countElement = document.createElement('span');
        countElement.id = countElementId;

        cartIcon.parentNode.insertBefore(countElement, cartIcon.nextSibling);
    }

    if (countElement) {
        if (totalItems > 0) {
            countElement.textContent = totalItems;
            countElement.style.display = 'inline-block';
        } else {
            countElement.textContent = '';
            countElement.style.display = 'none';
        }
    }
}

function readCart() {
    return JSON.parse(sessionStorage.getItem('solaceCart')) || [];
}

function addProductToCart(cart, existingItemIndex, product) {
    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += 1;
    } else {
        cart.push(product);
    }

    sessionStorage.setItem('solaceCart', JSON.stringify(cart));
}

function showCartFeedback(productItem, productId) {
    const messageElement = productItem.querySelector('.add-to-cart-message');
    if (messageElement) {
        messageElement.textContent = 'Added to cart!';
        messageElement.classList.add('show');

        setTimeout(() => {
            messageElement.classList.remove('show');
        }, 1500);
    } else {
        console.warn("Could not find .add-to-cart-message element for product:", productId);
        alert('Added to cart!');
    }

}
