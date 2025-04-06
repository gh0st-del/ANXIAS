// Function to fetch books from Open Library API
async function fetchBooks(query) {
    const response = await fetch(`https://openlibrary.org/search.json?q=${query}`);
    const data = await response.json();
    return data.docs; // Return the array of book documents
}

// Function to fetch detailed book information
async function fetchBookDetails(key) {
    const response = await fetch(`https://openlibrary.org${key}.json`);
    const data = await response.json();
    return data; // Return the detailed book information
}

// Function to display books
function displayBooks(bookList) {
    const bookListDiv = document.getElementById('bookList');
    bookListDiv.innerHTML = ''; // Clear previous results

    const selectedCategory = document.getElementById('categoryFilter').value;

    bookList.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-item';
        const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/150'; // Fallback image

        // Check if the book's category matches the selected category
        if (selectedCategory === "" || (book.subject && book.subject.includes(selectedCategory))) {
            bookItem.innerHTML = `
                <img src="${coverUrl}" alt="${book.title}">
                <h3>${book.title}</h3>
                <p>by ${book.author_name ? book.author_name.join(', ') : 'Unknown'}</p>
                <button class="favorite-button" onclick="addToFavorites('${book.isbn ? book.isbn[0] : 'N/A'}')">Add to Favorites</button>
                <button class="description-button" onclick="showBookDescription('${book.key}', this)">Show Description</button>
                                <div class="book-description" style="display: none;"></div>
            `;
            bookListDiv.appendChild(bookItem);
        }
    });
}

// Function to show book description
async function showBookDescription(key, button) {
    const detailedBook = await fetchBookDetails(key); // Fetch detailed book information
    const descriptionDiv = button.parentElement.querySelector('.book-description');

    // Check if description exists
    const description = detailedBook.description ? 
        (typeof detailedBook.description === 'string' ? detailedBook.description : detailedBook.description.value) : 
        'No description available.';

    descriptionDiv.innerHTML = `<p><strong>Description:</strong> ${description}</p>`;
    descriptionDiv.style.display = 'block'; // Show the description
}

// Function to filter books
async function filterBooks() {
    const searchInput = document.getElementById('searchInput').value;
    const books = await fetchBooks(searchInput);
    displayBooks(books);
}

// Function to add a book to favorites
function addToFavorites(isbn) {
    alert(`Book with ISBN ${isbn} added to favorites!`);
}

// Event listener for search button
document.getElementById('searchButton').addEventListener('click', filterBooks);

// Event listener for category filter
document.getElementById('categoryFilter').addEventListener('change', async () => {
    const searchInput = document.getElementById('searchInput').value;
    const books = await fetchBooks(searchInput);
    displayBooks(books);
});

// Event listener for Enter key in search input
document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        filterBooks();
    }
});



