// Array to store favorite books
let favoriteBooks = [];
let allBooks = [];
let currentView = 'all'; // 'all' or 'favorites'

// Function to fetch books from Open Library API with improved search
async function fetchBooks(query) {
    const sanitizedQuery = query.trim().toLowerCase();
    
    // Try exact title search first
    const exactResponse = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(sanitizedQuery)}&limit=50`);
    const exactData = await exactResponse.json();
    
    // If no exact results, fall back to general search
    if (exactData.docs.length === 0) {
        const generalResponse = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(sanitizedQuery)}&limit=50`);
        const generalData = await generalResponse.json();
        return generalData.docs;
    }
    
    // Sort results by relevance - exact title matches first
    return exactData.docs.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        
        // Exact match gets highest priority
        if (titleA === sanitizedQuery && titleB !== sanitizedQuery) return -1;
        if (titleB === sanitizedQuery && titleA !== sanitizedQuery) return 1;
        
        // Then partial matches sorted by closeness to query
        const aSimilarity = calculateSimilarity(titleA, sanitizedQuery);
        const bSimilarity = calculateSimilarity(titleB, sanitizedQuery);
        
        return bSimilarity - aSimilarity;
    });
}

// Helper function to calculate text similarity score
function calculateSimilarity(str1, str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    // Simple contains check
    if (str1.includes(str2)) return 0.9;
    if (str2.includes(str1)) return 0.8;
    
    // Check for partial word matches
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matchCount = 0;
    for (const word1 of words1) {
        if (word1.length <= 2) continue; // Skip very short words
        for (const word2 of words2) {
            if (word2.length <= 2) continue;
            if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                matchCount++;
                break;
            }
        }
    }
    
    return matchCount / Math.max(words1.length, words2.length);
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

    // Filter books based on current view
    const booksToDisplay = currentView === 'all' ? bookList : favoriteBooks;

    if (booksToDisplay.length === 0) {
        bookListDiv.innerHTML = '<p class="no-books">No books to display. Try searching for books or adding favorites.</p>';
        return;
    }
    
    // Display number of results
    const resultsHeader = document.createElement('div');
    resultsHeader.className = 'results-header';
    resultsHeader.innerHTML = `<p>Found ${booksToDisplay.length} books</p>`;
    bookListDiv.appendChild(resultsHeader);

    booksToDisplay.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-item';
        const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/150'; // Fallback image
        const isFavorite = favoriteBooks.some(favBook => favBook.key === book.key);
        
        // Make sure to escape any special characters in strings
        const safeTitle = book.title.replace(/['"`]/g, '\\$&');
        const safeAuthor = book.author_name && book.author_name[0] ? 
                          book.author_name[0].replace(/['"`]/g, '\\$&') : 'Unknown';
        
        bookItem.innerHTML = `
            <img src="${coverUrl}" alt="${safeTitle}">
            <h3>${book.title}</h3>
            <p>by ${book.author_name ? book.author_name.join(', ') : 'Unknown'}</p>
            <button class="favorite-button ${isFavorite ? 'added' : ''}" 
                    data-key="${book.key}"
                    data-title="${safeTitle}"
                    data-author="${safeAuthor}"
                    data-cover="${book.cover_i || 'default'}">
                ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
            <button class="description-button" data-key="${book.key}">Show Description</button>
            <div class="book-description" style="display: none;"></div>
        `;
        
        // Add event listeners - safer than inline onclick
        const favButton = bookItem.querySelector('.favorite-button');
        favButton.addEventListener('click', function() {
            toggleFavorite(
                this.getAttribute('data-key'),
                this.getAttribute('data-title'),
                this.getAttribute('data-author'),
                this.getAttribute('data-cover')
            );
        });
        
        const descButton = bookItem.querySelector('.description-button');
        descButton.addEventListener('click', function() {
            showBookDescription(this.getAttribute('data-key'), this);
        });
        
        bookListDiv.appendChild(bookItem);
    });
}

// Function to show book description
async function showBookDescription(key, button) {
    try {
        const descriptionDiv = button.nextElementSibling;
        
        // If already loaded, just toggle visibility
        if (descriptionDiv.innerHTML !== '') {
            if (descriptionDiv.style.display === 'none') {
                descriptionDiv.style.display = 'block';
                button.textContent = 'Hide Description';
            } else {
                descriptionDiv.style.display = 'none';
                button.textContent = 'Show Description';
            }
            return;
        }
        
        // Show loading state
        button.textContent = 'Loading...';
        button.disabled = true;
        
        const detailedBook = await fetchBookDetails(key);
        
        // Check if description exists
        const description = detailedBook.description ? 
            (typeof detailedBook.description === 'string' ? detailedBook.description : detailedBook.description.value) : 
            'No description available.';

        descriptionDiv.innerHTML = `<p><strong>Description:</strong> ${description}</p>`;
        descriptionDiv.style.display = 'block';
        button.textContent = 'Hide Description';
        button.disabled = false;
    } catch (error) {
        console.error('Error fetching book details:', error);
        button.textContent = 'Show Description';
        button.disabled = false;
        alert('Unable to fetch book description. Please try again later.');
    }
}

// Function to toggle a book in favorites
function toggleFavorite(key, title, author, coverId) {
    const index = favoriteBooks.findIndex(book => book.key === key);
    
    if (index === -1) {
        // Add to favorites
        const newFavorite = {
            key: key,
            title: title,
            author_name: [author],
            cover_i: coverId === 'default' ? null : coverId
        };
        favoriteBooks.push(newFavorite);
        alert(`"${title}" added to favorites!`);
    } else {
        // Remove from favorites
        favoriteBooks.splice(index, 1);
        alert(`"${title}" removed from favorites!`);
    }
    
    // If in favorites view, refresh the display
    if (currentView === 'favorites') {
        displayBooks(allBooks);
    } else {
        // Just update the button states
        const buttons = document.querySelectorAll(`.favorite-button[data-key="${key}"]`);
        buttons.forEach(button => {
            if (index === -1) {
                button.textContent = 'Remove from Favorites';
                button.classList.add('added');
            } else {
                button.textContent = 'Add to Favorites';
                button.classList.remove('added');
            }
        });
    }
    
    // Save favorites to localStorage
    localStorage.setItem('favoriteBooks', JSON.stringify(favoriteBooks));
}

// Function to filter books
async function filterBooks() {
    const searchInput = document.getElementById('searchInput').value;
    if (!searchInput.trim()) {
        alert('Please enter a search term');
        return;
    }
    
    try {
        document.getElementById('bookList').innerHTML = '<p class="loading">Searching books...</p>';
        const books = await fetchBooks(searchInput);
        allBooks = books;
        currentView = 'all';
        updateActiveTab();
        displayBooks(books);
    } catch (error) {
        console.error('Error searching books:', error);
        document.getElementById('bookList').innerHTML = '<p class="error">An error occurred while searching. Please try again later.</p>';
    }
}

// Function to update active tab
function updateActiveTab() {
    document.getElementById('showAllButton').classList.toggle('active', currentView === 'all');
    document.getElementById('showFavoritesButton').classList.toggle('active', currentView === 'favorites');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Event listener for search button
    document.getElementById('searchButton').addEventListener('click', filterBooks);

    // Event listener for Enter key in search input
    document.getElementById('searchInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            filterBooks();
        }
    });

    // Event listener for "All Books" button
    document.getElementById('showAllButton').addEventListener('click', function() {
        currentView = 'all';
        updateActiveTab();
        displayBooks(allBooks);
    });

    // Event listener for "My Favorites" button
    document.getElementById('showFavoritesButton').addEventListener('click', function() {
        currentView = 'favorites';
        updateActiveTab();
        displayBooks(allBooks);
    });
    
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('favoriteBooks');
    if (savedFavorites) {
        favoriteBooks = JSON.parse(savedFavorites);
    }
    
    // Show initial message
    const bookListDiv = document.getElementById('bookList');
    bookListDiv.innerHTML = '<p class="no-books">Search for books to get started!</p>';
});