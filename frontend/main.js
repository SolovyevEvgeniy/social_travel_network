class TravelSocial {
    constructor() {
        this.apiUrl = 'http://localhost:8000'; // URL вашего FastAPI бэкенда
        this.init();
        this.token = localStorage.getItem('token');
        this.updateAuthState();
    }

    init() {
        this.setupEventListeners();
        this.fetchPosts();
    }

    updateAuthState() {
        const navAuth = document.querySelector('.nav-auth');
        const navUser = document.querySelector('.nav-user');
        
        if (this.token) {
            navAuth.style.display = 'none';
            navUser.style.display = 'flex';
        } else {
            navAuth.style.display = 'block';
            navUser.style.display = 'none';
        }
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const loginModal = document.getElementById('loginModal');
        const loginForm = document.getElementById('loginForm');

        // Открытие модального окна при клике на кнопку входа
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });

        // Закрытие модального окна при клике вне его
        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });

        // Обработка отправки формы входа
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.handleLogin({
                email: formData.get('email'),
                password: formData.get('password')
            });
        });

        const registerForm = document.getElementById('registerForm');
        const registerModal = document.getElementById('registerModal');
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');

        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'block';
        });

        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.style.display = 'none';
            loginModal.style.display = 'block';
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.handleRegister({
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password')
            });
        });

        const logoutBtn = document.getElementById('logoutBtn');
        const addPostBtn = document.getElementById('addPostBtn');
        const addPostModal = document.getElementById('addPostModal');
        const addPostForm = document.getElementById('addPostForm');

        logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        addPostBtn.addEventListener('click', () => {
            addPostModal.style.display = 'block';
        });

        // Закрытие модального окна при клике вне его
        window.addEventListener('click', (e) => {
            if (e.target === addPostModal) {
                addPostModal.style.display = 'none';
            }
        });

        addPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.createPost(formData);
            addPostModal.style.display = 'none';
            e.target.reset();
        });

        // AI Assistant
        const aiAssistant = document.getElementById('aiAssistant');
        const aiMinimize = document.getElementById('aiMinimize');
        const aiInput = document.getElementById('aiInput');
        const aiSend = document.getElementById('aiSend');
        const aiMessages = document.getElementById('aiMessages');

        // WebSocket подключение
        this.ws = new WebSocket(`ws://localhost:8000/ws/${Date.now()}`);
        
        this.ws.onmessage = (event) => {
            const response = JSON.parse(event.data);
            aiMessages.innerHTML += `
                <div class="ai-message">${response.response.replace(/\n/g, '<br>')}</div>
            `;
            aiMessages.scrollTop = aiMessages.scrollHeight;
        };

        aiMinimize.addEventListener('click', (e) => {
            e.stopPropagation();
            aiAssistant.classList.toggle('minimized');
        });

        aiAssistant.querySelector('.ai-header').addEventListener('click', () => {
            if (aiAssistant.classList.contains('minimized')) {
                aiAssistant.classList.remove('minimized');
            }
        });

        const sendMessage = () => {
            const message = aiInput.value.trim();
            if (message) {
                // Добавляем сообщение пользователя
                aiMessages.innerHTML += `
                    <div class="ai-message user">${message}</div>
                `;
                
                // Отправляем сообщение через WebSocket
                this.ws.send(JSON.stringify({ message }));

                aiInput.value = '';
                aiMessages.scrollTop = aiMessages.scrollHeight;
            }
        };

        aiSend.addEventListener('click', sendMessage);
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    async handleLogin(credentials) {
        try {
            const formData = new URLSearchParams();
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);

            console.log('Login attempt for:', credentials.email); // Для отладки
            const response = await fetch(`${this.apiUrl}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            console.log('Login response status:', response.status); // Для отладки
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Login error:', errorText);
                throw new Error('Ошибка авторизации');
            }

            const data = await response.json();
            console.log('Login successful, token received'); // Для отладки
            this.token = data.access_token;
            localStorage.setItem('token', data.access_token);
            
            document.getElementById('loginModal').style.display = 'none';
            this.updateAuthState();
            this.showMessage('Успешный вход!', 'success');
            await this.fetchPosts();
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            this.showMessage('Ошибка авторизации. Проверьте email и пароль.', 'error');
        }
    }

    async handleRegister(userData) {
        try {
            const formData = new URLSearchParams();
            formData.append('email', userData.email);
            formData.append('username', userData.username);
            formData.append('password', userData.password);

            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Ошибка регистрации');
            }

            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('token', this.token);
            
            document.getElementById('registerModal').style.display = 'none';
            this.showMessage('Регистрация успешна!', 'success');
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showMessage('Ошибка при регистрации', 'error');
        }
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

    handleLogout() {
        localStorage.removeItem('token');
        this.token = null;
        this.updateAuthState();
        this.fetchPosts(); // обновляем посты после выхода
        this.showMessage('Вы вышли из системы', 'info');
    }

    async fetchPosts() {
        try {
            const response = await fetch(`${this.apiUrl}/posts`);
            console.log('Response status:', response.status);

            if (!response.ok) {
                console.error('Response error:', await response.text());
                throw new Error('Ошибка получения постов');
            }

            const posts = await response.json();
            console.log('Posts received:', posts);
            this.renderPosts(posts);
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка при загрузке постов', 'error');
        }
    }

    renderPosts(posts) {
        const container = document.getElementById('postsContainer');
        container.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            
            // Форматируем дату
            const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            // Формируем URL изображения
            let imageUrl;
            if (post.image_url) {
                imageUrl = post.image_url.startsWith('http') 
                    ? post.image_url 
                    : `${this.apiUrl}${post.image_url}`;
                console.log('Processing image URL:', imageUrl); // Для отладки
            } else {
                imageUrl = 'https://via.placeholder.com/800x400?text=No+Image';
            }
            
            postElement.innerHTML = `
                <div class="post-header">
                    <div class="post-author">
                        <img src="${post.owner.avatar_url || 'https://via.placeholder.com/40'}" 
                             alt="Avatar" 
                             class="author-avatar">
                        <div class="author-info">
                            <span class="author-name">${post.owner.username || 'Unknown'}</span>
                            <span class="post-date">${formattedDate}</span>
                        </div>
                    </div>
                </div>
                <div class="post-content">
                    <h3>${post.title}</h3>
                    ${post.location ? `<p class="post-location">📍 ${post.location}</p>` : ''}
                    <p>${post.content}</p>
                </div>
                <img src="${imageUrl}" 
                     alt="${post.title}" 
                     class="post-image"
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/800x400?text=Error+Loading+Image'; console.error('Failed to load image:', this.src);"
                >
                <div class="post-actions">
                    <button class="action-btn like-btn" onclick="app.likePost(${post.id})">
                        <i class="far fa-heart"></i>
                        <span class="likes-count">${post.likes_count || 0}</span>
                    </button>
                    <button class="action-btn comment-btn" onclick="app.toggleComments(${post.id})">
                        <i class="far fa-comment"></i>
                        <span>Комментировать</span>
                    </button>
                </div>
            `;
            
            container.appendChild(postElement);
        });
    }

    async createPost(formData) {
        try {
            const response = await fetch(`${this.apiUrl}/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to create post');
            }
            
            const post = await response.json();
            console.log('Created post:', post);
            
            // Добавляем задержку перед обновлением постов
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.fetchPosts();
            return true;
        } catch (error) {
            console.error('Error creating post:', error);
            return false;
        }
    }

    async refreshToken() {
        const credentials = localStorage.getItem('credentials');
        if (!credentials) {
            throw new Error('No stored credentials');
        }
        
        const { email, password } = JSON.parse(credentials);
        await this.handleLogin({ email, password });
    }

    async showUserProfile(username) {
        try {
            const response = await fetch(`${this.apiUrl}/users/${username}`);
            if (!response.ok) {
                throw new Error('Ошибка загрузки профиля');
            }
            
            const data = await response.json();
            const { user, posts } = data;
            
            // Показываем кнопку редактирования только для своего профиля
            const editProfileBtn = document.getElementById('editProfileBtn');
            const currentUserResponse = await fetch(`${this.apiUrl}/current-user`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const currentUser = await currentUserResponse.json();
            editProfileBtn.style.display = currentUser.username === username ? 'flex' : 'none';
            
            // Заполняем данные профиля
            document.querySelector('.profile-avatar').src = user.avatar_url;
            document.querySelector('.profile-name').textContent = user.full_name;
            document.querySelector('.profile-location').textContent = user.profile.location;
            document.querySelector('.profile-instagram').href = `https://instagram.com/${user.profile.instagram}`;
            document.querySelector('.profile-instagram').textContent = user.profile.instagram;
            
            document.getElementById('visitedCountries').textContent = user.profile.visited_countries;
            document.getElementById('travelCount').textContent = user.profile.travel_count;
            
            document.querySelector('.about-text').textContent = user.profile.about_me;
            document.querySelector('.interests-text').textContent = user.profile.interests;
            document.querySelector('.travel-style-text').textContent = user.profile.travel_style;
            document.querySelector('.favorite-places-text').textContent = user.profile.favorite_places;
            document.querySelector('.next-destination-text').textContent = user.profile.next_destination;
            
            // Отображаем посты пользователя
            const postsGrid = document.querySelector('.user-posts-grid');
            postsGrid.innerHTML = posts.map(post => `
                <div class="post-card">
                    <img src="${post.image_url.startsWith('http') ? post.image_url : this.apiUrl + post.image_url}" 
                         alt="${post.title}" 
                         class="post-image"
                         onerror="this.src='https://via.placeholder.com/400x300?text=Ошибка+загрузки+изображения'"
                     >
                    <h3>${post.title}</h3>
                    <p>${post.location}</p>
                </div>
            `).join('');
            
            document.getElementById('profileModal').style.display = 'block';
            
            // Добавляем обработчик для кнопки редактирования
            editProfileBtn.onclick = () => {
                const editModal = document.getElementById('editProfileModal');
                const form = document.getElementById('editProfileForm');
                
                // Заполняем форму екущими данными
                form.elements['full_name'].value = user.full_name || '';
                form.elements['location'].value = user.profile.location || '';
                form.elements['about_me'].value = user.profile.about_me || '';
                form.elements['instagram'].value = user.profile.instagram || '';
                form.elements['interests'].value = user.profile.interests || '';
                form.elements['travel_style'].value = user.profile.travel_style || '';
                form.elements['favorite_places'].value = user.profile.favorite_places || '';
                form.elements['next_destination'].value = user.profile.next_destination || '';
                form.elements['visited_countries'].value = user.profile.visited_countries || 0;
                
                editModal.style.display = 'block';
            };
            
            // Обработчик отправки формы редактирования
            document.getElementById('editProfileForm').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                try {
                    const response = await fetch(`${this.apiUrl}/users/profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${this.token}`
                        },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('Ошибка при обновлении профиля');
                    }
                    
                    document.getElementById('editProfileModal').style.display = 'none';
                    this.showMessage('Профиль успешно обновлен', 'success');
                    // Обновляем отображение профиля
                    this.showUserProfile(username);
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showMessage('Ошибка при обновлении профиля', 'error');
                }
            };
            
            // Добавляем обработчики для кнопок подписки и сообщений
            const followBtn = document.getElementById('followBtn');
            const messageBtn = document.getElementById('messageBtn');
            
            // Проверяем, подписаны ли мы уже
            const isFollowing = await this.checkFollowStatus(username);
            followBtn.textContent = isFollowing ? 'Отписаться' : 'Подписаться';
            
            followBtn.onclick = async () => {
                try {
                    const response = await fetch(`${this.apiUrl}/users/${username}/follow`, {
                        method: isFollowing ? 'DELETE' : 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.token}`
                        }
                    });
                    
                    if (response.ok) {
                        isFollowing = !isFollowing;
                        followBtn.textContent = isFollowing ? 'Отписаться' : 'Подписатьс';
                        this.showMessage(isFollowing ? 'Вы подписались' : 'Вы отписались', 'success');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showMessage('Ошибка при изменении подписки', 'error');
                }
            };
            
            messageBtn.onclick = () => {
                document.getElementById('messageModal').style.display = 'block';
                this.loadMessages(username);
            };
            
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка при загрузке профиля', 'error');
        }
    }

    async loadMessages(username) {
        try {
            const response = await fetch(`${this.apiUrl}/messages/${username}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const messages = await response.json();
                const messagesList = document.querySelector('.messages-list');
                messagesList.innerHTML = messages.map(msg => `
                    <div class="message-item ${msg.sender_id === currentUser.id ? 'sent' : 'received'}">
                        <div class="message-content">${msg.content}</div>
                        <div class="message-time">${new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка при загрузке сообщений', 'error');
        }
    }

    async toggleComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            await this.loadComments(postId);
        } else {
            commentsSection.style.display = 'none';
        }
    }

    async loadComments(postId) {
        try {
            const response = await fetch(`${this.apiUrl}/posts/${postId}/comments`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const comments = await response.json();
                const commentsList = document.getElementById(`comments-list-${postId}`);
                commentsList.innerHTML = comments.map(comment => `
                    <div class="comment">
                        <div class="comment-header">
                            <img src="${comment.user.avatar_url}" 
                                 alt="Avatar" 
                                 class="comment-avatar"
                                 onerror="this.src='https://via.placeholder.com/30'"
                            >
                            <div class="comment-info">
                                <span class="comment-author" onclick="app.showUserProfile('${comment.user.username}')">
                                    ${comment.user.full_name || comment.user.username}
                                </span>
                                <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="comment-content">${comment.content}</div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка при загрузке комментариев', 'error');
        }
    }

    async submitComment(event, postId) {
        event.preventDefault();
        const form = event.target;
        const content = form.querySelector('textarea').value;
        
        try {
            const response = await fetch(`${this.apiUrl}/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                form.reset();
                await this.loadComments(postId);
                this.showMessage('Комментарий добавлен', 'success');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showMessage('Ошибка при отправке комментария', 'error');
        }
    }

    async likePost(postId) {
        if (!this.token) {
            this.showMessage('Необходимо войти в систему', 'error');
            return;
        }

        try {
            const likeBtn = document.querySelector(`[onclick="app.likePost(${postId})"]`);
            const likesCountSpan = likeBtn.querySelector('.likes-count');
            const heartIcon = likeBtn.querySelector('i');
            const isLiked = likeBtn.classList.contains('liked');

            const response = await fetch(`${this.apiUrl}/posts/${postId}/like`, {
                method: isLiked ? 'DELETE' : 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                likesCountSpan.textContent = data.likes_count;
                
                if (isLiked) {
                    likeBtn.classList.remove('liked');
                    heartIcon.classList.replace('fas', 'far');
                } else {
                    likeBtn.classList.add('liked');
                    heartIcon.classList.replace('far', 'fas');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Ошибка при обработке лайка', 'error');
        }
    }

    async sharePost(postId) {
        try {
            const post = this.posts.find(p => p.id === postId);
            if (post) {
                if (navigator.share) {
                    await navigator.share({
                        title: post.title,
                        text: post.content,
                        url: window.location.href
                    });
                } else {
                    // Fallback для баузеров без Web Share API
                    const shareUrl = `${window.location.origin}/post/${postId}`;
                    await navigator.clipboard.writeText(shareUrl);
                    this.showMessage('Ссылка скопирована в буфер обмена', 'success');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Ошибка при попытке поделиться постом', 'error');
        }
    }

    async repostPost(postId) {
        if (!this.token) {
            this.showMessage('Необходимо войти в систему', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/posts/${postId}/repost`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.showMessage('Пост успешно репостнут', 'success');
                await this.fetchPosts();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Ошибка при репосте', 'error');
        }
    }
}

class TripPlanner {
    constructor() {
        this.checklist = [
            { category: 'Документы', items: ['Паспорт', 'Визы', 'Страховка'] },
            { category: 'Транспорт', items: ['Билеты', 'Трансфер'] },
            { category: 'Проживание', items: ['Отель', 'Регистрация'] }
        ];
    }
    
    createNewTrip(destination, dates) {
        return {
            destination,
            dates,
            checklist: this.generateChecklist(),
            budget: this.calculateEstimatedBudget(destination, dates),
            weatherForecast: this.getWeatherForecast(destination, dates)
        };
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new TravelSocial();
    // Делаем app глобально доступным для работы onclick в HTML
    window.app = app;
}); 