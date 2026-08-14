const planButton = document.getElementById('planButton');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');
const destinationInput = document.getElementById('destinationInput');
const daysInput = document.getElementById('daysInput');
const styleInput = document.getElementById('styleInput');
const resultsContainer = document.getElementById('resultsContainer');
const tripMeta = document.getElementById('tripMeta');
const itineraryGrid = document.getElementById('itineraryGrid');

planButton.addEventListener('click', async function() {
    const destination = destinationInput.value;
    const days = parseInt(daysInput.value) || 3; 
    const style = styleInput.value;

    if (!destination) {
        alert("Enter a destination to plan your trip.");
        return;
    }

    // Reset UI for new search
    resultsContainer.classList.add('hidden'); 
    itineraryGrid.innerHTML = ''; 
    planButton.disabled = true;
    loadingSpinner.classList.remove('hidden');

    // --- BULLETPROOF DYNAMIC LOADING UX ---
    const loadingMessages = [
        `Booking imaginary flights to ${destination}...`,
        `Scouting the best local street food...`,
        `Finding a bed with the perfect view...`,
        `Translating local slang...`,
        `Upgrading you to first class...`,
        `Almost there, packing your bags...`
    ];
    let messageIndex = 0;
    buttonText.innerText = loadingMessages[0];
    
    // Change the text every 2 seconds
    const loadingInterval = setInterval(() => {
        messageIndex++;
        if (messageIndex >= loadingMessages.length) messageIndex = 0;
        buttonText.innerText = loadingMessages[messageIndex];
    }, 2000);
    // --------------------------------------

    try {
        const response = await fetch('http://localhost:5000/api/plan-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination, days, style })
        });

        const data = await response.json();

        // Catch the "INVALID_DESTINATION" Reality Check or server crashes
        if (data.error) {
            alert(data.error);
            throw new Error(data.error);
        }

        const itinerary = data.itinerary; 
        tripMeta.innerText = `${days} Days • ${style} Mode • ${destination}`;

        itinerary.forEach((dayData, index) => {
            const dayNumber = index + 1;
            const imgUrl = dayData.imgUrl;
            
            const tagsHTML = dayData.tags.map(tag => 
                `<span class="bg-gray-900/80 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-700 shadow-sm">${tag}</span>`
            ).join('');

            const cardHTML = `
                <div class="group bg-gray-800/80 backdrop-blur-md rounded-3xl overflow-hidden border border-gray-700 shadow-2xl flex flex-col md:flex-row transform transition-all hover:-translate-y-1 hover:shadow-blue-900/20 duration-300 fade-in-up" style="animation-delay: ${index * 0.1}s">
                    
                    <!-- Left: Interactive Image Section -->
                    <div class="md:w-5/12 h-64 md:h-auto relative bg-gray-900 overflow-hidden">
                        <img src="${imgUrl}" alt="Day ${dayNumber} in ${destination}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent"></div>
                        <div class="absolute bottom-5 left-6">
                            <span class="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                                Day ${dayNumber}
                            </span>
                        </div>
                    </div>

                    <!-- Right: Text & Details Section -->
                    <div class="md:w-7/12 p-6 md:p-10 flex flex-col justify-center">
                        <h3 class="text-3xl font-bold text-white mb-4 tracking-tight">${dayData.title}</h3>
                        <p class="text-gray-300 text-base leading-relaxed mb-6 font-light">
                            ${dayData.desc}
                        </p>
                        
                        <!-- Hotel & Dining Module -->
                        <div class="flex flex-col gap-4 mb-6 bg-gray-900/50 p-5 rounded-2xl border border-gray-700/50">
                            <div class="flex items-start gap-3">
                                <span class="text-2xl mt-1">🏨</span>
                                <div>
                                    <p class="text-xs text-blue-400 uppercase tracking-wider font-bold">Accommodation</p>
                                    <p class="text-white text-sm font-medium">${dayData.hotel || 'Local Boutique Hotel'}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-2xl mt-1">🍽️</span>
                                <div>
                                    <p class="text-xs text-purple-400 uppercase tracking-wider font-bold">Dining</p>
                                    <p class="text-white text-sm font-medium">${dayData.dining || 'Highly Rated Local Restaurant'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Tags -->
                        <div class="flex flex-wrap gap-2 mt-auto">
                            ${tagsHTML}
                        </div>
                    </div>
                </div>
            `;
            
            itineraryGrid.insertAdjacentHTML('beforeend', cardHTML);
        });

        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error(error);
    } finally {
        clearInterval(loadingInterval); // Stop the text cycle!
        planButton.disabled = false;
        buttonText.innerText = "Plan Another Trip";
        loadingSpinner.classList.add('hidden');
    }
});