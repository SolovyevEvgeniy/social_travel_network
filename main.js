class TravelSocial {
    constructor() {
        this.init();
        this.posts = [];
        this.apiUrl = 'http://localhost:8000'; // URL вашего FastAPI бэкенда
        this.token = localStorage.getItem('token');
        this.setupAlbums();
    }

    init() {
        this.setupEventListeners();
        this.setupChatbot();
        this.fetchPosts();
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const loginModal = document.getElementById('loginModal');
        const loginForm = document.getElementById('loginForm');

        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });

        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.handleLogin({
                email: formData.get('email'),
                password: formData.get('password')
            });
        });

        const postForm = document.getElementById('postForm');
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.createPost({
                title: formData.get('title'),
                content: formData.get('content')
            });
        });

        // Добавим обработчик для предпросмотра изображения
        const imageInput = document.getElementById('postImage');
        const imagePreview = document.getElementById('imagePreview');

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });

        const addPlaceBtn = document.getElementById('addPlaceBtn');
        const addPlaceModal = document.getElementById('addPlaceModal');
        const addPlaceForm = document.getElementById('addPlaceForm');

        addPlaceBtn.addEventListener('click', () => {
            addPlaceModal.style.display = 'block';
        });

        addPlaceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.createPlace({
                name: formData.get('name'),
                description: formData.get('description'),
                location: formData.get('location'),
                coordinates: formData.get('coordinates')
            });
            addPlaceModal.style.display = 'none';
        });

        // Обработчик для предпросмотра изображения места
        const placeImageInput = document.getElementById('placeImage');
        const placeImagePreview = document.getElementById('placeImagePreview');

        placeImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    placeImagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async handleLogin(credentials) {
        try {
            const formData = new URLSearchParams();
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);

            const response = await fetch(`${this.apiUrl}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Ошибка авторизации');
            }

            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('token', this.token);
            
            document.getElementById('loginModal').style.display = 'none';
            await this.fetchPosts(); // Обновляем посты после успешной авторизации
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            alert('Ошибка авторизации. Проверьте email и пароль.');
        }
    }

    async fetchPosts() {
        try {
            if (!this.token) {
                throw new Error('Требуется авторизация');
            }

            const response = await fetch(`${this.apiUrl}/posts`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка получения постов');
            }

            this.posts = await response.json();
            this.renderPosts();
        } catch (error) {
            console.error('Ошибка при загрузке постов:', error);
            const postsContainer = document.getElementById('postsContainer');
            postsContainer.innerHTML = '<div class="error">Ошибка загрузки постов. Пожалуйста, авторизуйтесь.</div>';
        }
    }

    async createPost(postData) {
        try {
            if (!this.token) {
                throw new Error('Требуется авторизация');
            }

            const imageInput = document.getElementById('postImage');
            if (imageInput.files.length > 0) {
                const imageUrl = await this.uploadImage(imageInput.files[0]);
                postData.image_url = imageUrl;
            }

            const response = await fetch(`${this.apiUrl}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                throw new Error('Ошибка создания поста');
            }

            const newPost = await response.json();
            this.posts.unshift(newPost);
            this.renderPosts();
            
            document.getElementById('postForm').reset();
            this.showMessage('Пост успешно создан!', 'success');
        } catch (error) {
            console.error('Ошибка при создании поста:', error);
            this.showMessage('Ошибка при создании поста', 'error');
        }
    }

    async updatePost(postId, postData) {
        try {
            const response = await fetch(`${this.apiUrl}/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                throw new Error('Ошибка обновления поста');
            }

            const updatedPost = await response.json();
            const index = this.posts.findIndex(p => p.id === postId);
            if (index !== -1) {
                this.posts[index] = updatedPost;
                this.renderPosts();
            }
            this.showMessage('Пост успешно обновлен!', 'success');
        } catch (error) {
            console.error('Ошибка при обновлении поста:', error);
            this.showMessage('Ошибка при обновлении поста', 'error');
        }
    }

    async deletePost(postId) {
        try {
            const response = await fetch(`${this.apiUrl}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка удаления поста');
            }

            this.posts = this.posts.filter(p => p.id !== postId);
            this.renderPosts();
            this.showMessage('Пост успешно удален!', 'success');
        } catch (error) {
            console.error('Ошибка при удалении поста:', error);
            this.showMessage('Ошибка при удалении поста', 'error');
        }
    }

    async editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        // Создаем модальное окно для редактирования
        const modalHtml = `
            <div class="edit-modal" id="editModal">
                <div class="modal-content">
                    <button class="close-btn">&times;</button>
                    <h2>Редактировать пост</h2>
                    <form id="editPostForm">
                        <input type="text" name="title" value="${post.title}" required>
                        <textarea name="content" required>${post.content}</textarea>
                        <button type="submit">Сохранить изменения</button>
                    </form>
                </div>
            </div>
        `;

        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('editModal');
        const closeBtn = modal.querySelector('.close-btn');
        const form = modal.querySelector('form');

        modal.style.display = 'block';

        // Обработчики событий
        closeBtn.onclick = () => {
            modal.remove();
        };

        window.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            await this.updatePost(postId, {
                title: formData.get('title'),
                content: formData.get('content')
            });
            modal.remove();
        };
    }

    renderPosts() {
        const postsContainer = document.getElementById('postsContainer');
        if (!this.posts.length) {
            postsContainer.innerHTML = '<div class="no-posts">Нет доступных постов</div>';
            return;
        }

        postsContainer.innerHTML = this.posts.map(post => `
            <article class="post" data-id="${post.id}">
                <div class="post-header">
                    <h3>${post.title}</h3>
                    ${post.author_id === this.currentUser?.id ? `
                        <div class="post-actions">
                            <button class="edit-post-btn" onclick="app.editPost(${post.id})">
                                <i class="fas fa-edit"></i> Редактировать
                            </button>
                            <button class="delete-post-btn" onclick="app.deletePost(${post.id})">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    ` : ''}
                </div>
                <p class="post-content">${post.content}</p>
                ${post.image_url ? `
                    <div class="post-image">
                        <img src="${post.image_url}" alt="Post image">
                    </div>
                ` : ''}
                <div class="post-meta">
                    <span class="author">
                        <i class="fas fa-user"></i> ${post.author_username}
                    </span>
                    <span class="date">
                        <i class="fas fa-calendar"></i> 
                        ${new Date(post.date).toLocaleDateString('ru-RU')}
                    </span>
                </div>
            </article>
        `).join('');
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message ${type}`;
        messageContainer.textContent = message;
        
        document.body.appendChild(messageContainer);
        
        setTimeout(() => {
            messageContainer.remove();
        }, 3000);
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.apiUrl}/upload-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки изображения');
        }

        const data = await response.json();
        return data.image_url;
    }

    setupChatbot() {
        const chatForm = document.getElementById('chatForm');
        const chatMessages = document.getElementById('chatMessages');

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const message = formData.get('message');

            // Добавляем сообщение пользователя
            chatMessages.innerHTML += `
                <div class="user-message">${message}</div>
            `;

            try {
                const response = await fetch(`${this.apiUrl}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ message })
                });

                if (!response.ok) {
                    throw new Error('Ошибка получения ответа');
                }

                const data = await response.json();
                
                // Добавляем ответ бота
                chatMessages.innerHTML += `
                    <div class="bot-message">${data.response}</div>
                `;

                // Прокручиваем к последнему сообщению
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Очищаем форму
                chatForm.reset();
            } catch (error) {
                console.error('Ошибка чата:', error);
                this.showMessage('Ошибка получения ответа от бота', 'error');
            }
        });
    }

    async createPlace(placeData) {
        try {
            const imageInput = document.getElementById('placeImage');
            if (imageInput.files.length > 0) {
                const imageUrl = await this.uploadImage(imageInput.files[0]);
                placeData.image_url = imageUrl;
            }

            const response = await fetch(`${this.apiUrl}/places`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(placeData)
            });

            if (!response.ok) {
                throw new Error('Ошибка создания места');
            }

            const newPlace = await response.json();
            await this.fetchPlaces();
            this.showMessage('Место успешно добавлено!', 'success');
            document.getElementById('addPlaceForm').reset();
        } catch (error) {
            console.error('Ошибка при создании места:', error);
            this.showMessage('Ошибка при создании места', 'error');
        }
    }

    async fetchPlaces() {
        try {
            const response = await fetch(`${this.apiUrl}/places`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка получения мест');
            }

            const places = await response.json();
            this.renderPlaces(places);
        } catch (error) {
            console.error('Ошибка при загрузке мест:', error);
            this.showMessage('Ошибка при загрузке мест', 'error');
        }
    }

    async createReview(placeId, reviewData) {
        try {
            const response = await fetch(`${this.apiUrl}/places/${placeId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(reviewData)
            });

            if (!response.ok) {
                throw new Error('Ошибка создания отзыва');
            }

            await this.fetchPlaces();
            this.showMessage('Отзыв успешно добавлен!', 'success');
        } catch (error) {
            console.error('Ошибка при создании отзыва:', error);
            this.showMessage('Ошибка при создании отзыва', 'error');
        }
    }

    renderPlaces(places) {
        const placesGrid = document.getElementById('placesGrid');
        placesGrid.innerHTML = places.map(place => `
            <div class="place-card">
                ${place.image_url ? `
                    <img src="${place.image_url}" alt="${place.name}" class="place-image">
                ` : ''}
                <div class="place-content">
                    <div class="place-header">
                        <h3 class="place-title">${place.name}</h3>
                        <div class="place-rating">
                            <i class="fas fa-star"></i>
                            <span>${place.rating.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="place-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${place.location}</span>
                    </div>
                    <p class="place-description">${place.description}</p>
                    <div class="place-stats">
                        <span>
                            <i class="fas fa-comment"></i>
                            ${place.reviews_count} отзывов
                        </span>
                        <button class="add-review-btn" onclick="app.showReviewForm(${place.id})">
                            <i class="fas fa-plus"></i> Добавить отзыв
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showReviewForm(placeId) {
        const modalHtml = `
            <div class="modal" id="reviewModal">
                <div class="modal-content">
                    <h2>Добавить отзыв</h2>
                    <form id="reviewForm" class="review-form">
                        <div class="rating-select">
                            <label>Ваша оценка:</label>
                            <div class="star-rating">
                                ${[5,4,3,2,1].map(num => `
                                    <input type="radio" id="star${num}" name="rating" value="${num}">
                                    <label for="star${num}"><i class="fas fa-star"></i></label>
                                `).join('')}
                            </div>
                        </div>
                        <textarea name="content" placeholder="Поделитесь своими впечатлениями..." required></textarea>
                        <button type="submit">Отправить отзыв</button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('reviewModal');
        const form = modal.querySelector('form');

        modal.style.display = 'block';

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            await this.createReview(placeId, {
                content: formData.get('content'),
                rating: parseInt(formData.get('rating')),
                place_id: placeId
            });
            modal.remove();
        };
    }

    setupTripPlanning() {
        const createTripBtn = document.getElementById('createTripBtn');
        const createTripModal = document.getElementById('createTripModal');
        const createTripForm = document.getElementById('createTripForm');
        const addPlacesToTripBtn = document.getElementById('addPlacesToTrip');

        createTripBtn.addEventListener('click', () => {
            createTripModal.style.display = 'block';
        });

        addPlacesToTripBtn.addEventListener('click', () => {
            this.showPlacesSelector();
        });

        createTripForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.createTrip({
                title: formData.get('title'),
                start_date: new Date(formData.get('start_date')),
                end_date: new Date(formData.get('end_date')),
                description: formData.get('description'),
                budget: parseFloat(formData.get('budget')),
                places: this.selectedPlaceIds,
                visibility: formData.get('visibility')
            });
            createTripModal.style.display = 'none';
        });

        this.fetchTrips();
    }

    async createTrip(tripData) {
        try {
            const response = await fetch(`${this.apiUrl}/trips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(tripData)
            });

            if (!response.ok) {
                throw new Error('Ошибка создания путешествия');
            }

            await this.fetchTrips();
            this.showMessage('Путешествие успешно создано!', 'success');
        } catch (error) {
            console.error('Ошибка при создании путешествия:', error);
            this.showMessage('Ошибка при создании путешествия', 'error');
        }
    }

    async fetchTrips() {
        try {
            const response = await fetch(`${this.apiUrl}/trips`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка получения путешествий');
            }

            const trips = await response.json();
            this.renderTrips(trips);
        } catch (error) {
            console.error('Ошибка при загрузке путешествий:', error);
            this.showMessage('Ошибка при загрузке путешествий', 'error');
        }
    }

    renderTrips(trips) {
        const tripsList = document.getElementById('tripsList');
        if (!trips.length) {
            tripsList.innerHTML = '<div class="no-trips">У вас пока нет запланированных путешествий</div>';
            return;
        }

        tripsList.innerHTML = trips.map(trip => `
            <div class="trip-card">
                <div class="trip-header">
                    <h3>${trip.title}</h3>
                    <span class="trip-status">${trip.status}</span>
                </div>
                <div class="trip-content">
                    <div class="trip-dates">
                        <span>
                            <i class="fas fa-calendar-alt"></i>
                            ${new Date(trip.start_date).toLocaleDateString('ru-RU')}
                        </span>
                        <span>
                            <i class="fas fa-arrow-right"></i>
                        </span>
                        <span>
                            <i class="fas fa-calendar-alt"></i>
                            ${new Date(trip.end_date).toLocaleDateString('ru-RU')}
                        </span>
                    </div>
                    <div class="trip-budget">
                        <i class="fas fa-wallet"></i>
                        ${trip.budget.toLocaleString('ru-RU')} ₽
                    </div>
                    <p class="trip-description">${trip.description}</p>
                    <div class="trip-places">
                        ${trip.places.map(place => `
                            <span class="place-chip">
                                <i class="fas fa-map-marker-alt"></i>
                                ${place.name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    showPlacesSelector() {
        // Реализация выбора мест для путешествия
        // Можно использовать существующий список мест
        // и добавить возможность выбора
    }

    async updatePrivacySettings(settings) {
        try {
            const response = await fetch(`${this.apiUrl}/privacy`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Ошибка обновления настроек приватности');
            }

            this.showMessage('Настройки приватности обновлены', 'success');
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка обновления настроек', 'error');
        }
    }

    async uploadAlbum(files, description, costs) {
        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => {
                formData.append('photos[]', file);
            });
            formData.append('description', description);
            formData.append('costs', JSON.stringify(costs));

            const response = await fetch(`${this.apiUrl}/albums`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки альбома');
            }

            this.showMessage('Альбом успешно создан!', 'success');
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка создания альбома', 'error');
        }
    }

    setupAlbums() {
        const createAlbumForm = document.getElementById('createAlbumForm');
        const albumsGrid = document.getElementById('albumsGrid');

        createAlbumForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.createAlbum({
                title: formData.get('title'),
                description: formData.get('description'),
                cost: formData.get('cost'),
                visibility: formData.get('visibility'),
                additionalInfo: formData.get('additionalInfo')
            });
        });
    }

    async createAlbum(albumData) {
        try {
            const response = await fetch(`${this.apiUrl}/albums`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(albumData)
            });

            if (!response.ok) {
                throw new Error('Ошибка создания альбома');
            }

            const newAlbum = await response.json();
            await this.fetchAlbums();
            this.showMessage('Альбом успешно создан!', 'success');
            document.getElementById('createAlbumForm').reset();
        } catch (error) {
            console.error('Ошибка при создании альбома:', error);
            this.showMessage('Ошибка при создании альбома', 'error');
        }
    }

    async fetchAlbums() {
        try {
            const response = await fetch(`${this.apiUrl}/albums`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка получения альбомов');
            }

            const albums = await response.json();
            this.renderAlbums(albums);
        } catch (error) {
            console.error('Ошибка при загрузке альбомов:', error);
            this.showMessage('Ошибка при загрузке альбомов', 'error');
        }
    }

    renderAlbums(albums) {
        const albumsGrid = document.getElementById('albumsGrid');
        if (!albums.length) {
            albumsGrid.innerHTML = '<div class="no-albums">У вас пока нет альбомов</div>';
            return;
        }

        albumsGrid.innerHTML = albums.map(album => `
            <div class="album-card">
                <div class="album-header">
                    <h3>${album.title}</h3>
                    <span class="album-visibility">${album.visibility}</span>
                </div>
                <div class="album-content">
                    <p class="album-description">${album.description}</p>
                    ${album.cost ? `
                        <div class="album-cost">
                            <i class="fas fa-tag"></i>
                            ${album.cost.toLocaleString('ru-RU')} ₽
                        </div>
                    ` : ''}
                    <div class="album-photos">
                        ${album.photos ? album.photos.map(photo => `
                            <img src="${photo.url}" alt="Photo" class="album-photo">
                        `).join('') : ''}
                    </div>
                    <button class="add-photo-btn" onclick="app.showAddPhotoForm(${album.id})">
                        <i class="fas fa-plus"></i> Добавить фото
                    </button>
                </div>
            </div>
        `).join('');
    }

    showAddPhotoForm(albumId) {
        const modalHtml = `
            <div class="modal" id="addPhotoModal">
                <div class="modal-content">
                    <h2>Добавить фото</h2>
                    <form id="addPhotoForm" class="photo-form">
                        <input type="file" name="photo" accept="image/*" required>
                        <button type="submit">Загрузить</button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('addPhotoModal');
        const form = modal.querySelector('form');

        modal.style.display = 'block';

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            await this.addPhotoToAlbum(albumId, formData.get('photo'));
            modal.remove();
        };
    }

    async addPhotoToAlbum(albumId, photoFile) {
        try {
            const imageUrl = await this.uploadImage(photoFile);
            const response = await fetch(`${this.apiUrl}/albums/${albumId}/photos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ url: imageUrl })
            });

            if (!response.ok) {
                throw new Error('Ошибка добавления фото');
            }

            await this.fetchAlbums();
            this.showMessage('Фото успешно добавлено!', 'success');
        } catch (error) {
            console.error('Ошибка при добавлении фото:', error);
            this.showMessage('Ошибка при добавлении фото', 'error');
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new TravelSocial();
}); 