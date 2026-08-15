const planButton = document.getElementById('planButton');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');
const styleInput = document.getElementById('styleInput');
const resultsContainer = document.getElementById('resultsContainer');
const tripMeta = document.getElementById('tripMeta');
const itineraryGrid = document.getElementById('itineraryGrid');

const addDestBtn = document.getElementById('addDestBtn');
const destinationsList = document.getElementById('destinationsList');

addDestBtn.addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'destination-row flex gap-2 w-full fade-in-up';
    newRow.innerHTML = `
        <input type="text" class="dest-input w-2/3 p-4 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-blue-500 outline-none shadow-inner transition-colors" placeholder="E.g., Kyoto, Japan">
        <input type="number" class="days-input w-1/3 p-4 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-blue-500 outline-none shadow-inner transition-colors" placeholder="Days" min="1" value="2">
    `;
    destinationsList.appendChild(newRow);
});

planButton.addEventListener('click', async function() {
    const destRows = document.querySelectorAll('.destination-row');
    const destinations = [];
    
    destRows.forEach(row => {
        const loc = row.querySelector('.dest-input').value.trim();
        const d = parseInt(row.querySelector('.days-input').value) || 1;
        if (loc) {
            destinations.push({ location: loc, days: d });
        }
    });

    if (destinations.length === 0) {
        alert("Please enter at least one destination to plan your trip.");
        return;
    }

    const style = styleInput.value;
    const totalDays = destinations.reduce((sum, dest) => sum + dest.days, 0);
    const destNames = destinations.map(d => d.location).join(" & ");

    resultsContainer.classList.add('hidden'); 
    itineraryGrid.innerHTML = ''; 
    planButton.disabled = true;
    loadingSpinner.classList.remove('hidden');

    const loadingMessages = [
        `Mapping routes for ${destinations.length} destinations...`,
        `Scouting the best local street food...`,
        `Checking transit schedules...`,
        `Translating local slang...`,
        `Writing down local secrets...`,
        `Almost there, packing your bags...`
    ];
    let messageIndex = 0;
    buttonText.innerText = loadingMessages[0];
    
    const loadingInterval = setInterval(() => {
        messageIndex++;
        if (messageIndex >= loadingMessages.length) messageIndex = 0;
        buttonText.innerText = loadingMessages[messageIndex];
    }, 2000);

    try {
        const response = await fetch('http://localhost:5000/api/plan-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinations, style })
        });

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            throw new Error(data.error);
        }

        const itinerary = data.itinerary; 
        tripMeta.innerText = `${totalDays} Days • ${style} Mode • ${destNames}`;

        itinerary.forEach((dayData, index) => {
            const dayNumber = index + 1;
            const imgUrl = dayData.imgUrl;
            const currentCity = dayData.location || "On the move"; 
            
            const tagsHTML = dayData.tags.map(tag => 
                `<span class="bg-gray-900/80 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-700 shadow-sm">${tag}</span>`
            ).join('');

            const cardHTML = `
                <div class="group bg-gray-800/80 backdrop-blur-md rounded-3xl overflow-hidden border border-gray-700 shadow-2xl flex flex-col md:flex-row transform transition-all hover:-translate-y-1 hover:shadow-blue-900/20 duration-300 fade-in-up" style="animation-delay: ${index * 0.1}s">
                    
                    <div class="md:w-5/12 h-64 md:h-auto relative bg-gray-900 overflow-hidden">
                        <img src="${imgUrl}" alt="Day ${dayNumber} in ${currentCity}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent"></div>
                        <div class="absolute bottom-5 left-6 flex flex-col gap-1">
                            <span class="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg w-max">
                                Day ${dayNumber}
                            </span>
                            <span class="text-white text-sm font-bold drop-shadow-md ml-2 flex items-center gap-1">
                                📍 ${currentCity}
                            </span>
                        </div>
                    </div>

                    <div class="md:w-7/12 p-6 md:p-10 flex flex-col justify-center">
                        <h3 class="text-3xl font-bold text-white mb-4 tracking-tight">${dayData.title}</h3>
                        <p class="text-gray-300 text-base leading-relaxed mb-6 font-light">
                            ${dayData.desc}
                        </p>
                        
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

                        <div class="flex flex-wrap gap-2 mt-4">
                            ${tagsHTML}
                        </div>

                        <!-- THE NEW LOCAL TIP BOX -->
                        <div class="mt-6 bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-xl shadow-inner">
                            <div class="flex items-start gap-3">
                                <span class="text-xl">💡</span>
                                <p class="text-yellow-100 text-sm font-medium leading-relaxed">
                                    <strong class="text-yellow-400 uppercase text-xs tracking-wider block mb-1">Local Tip</strong>
                                    ${dayData.daily_tip || 'Keep your camera ready and have fun!'}
                                </p>
                            </div>
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
        clearInterval(loadingInterval);
        planButton.disabled = false;
        buttonText.innerText = "Plan Another Trip";
        loadingSpinner.classList.add('hidden');
    }
});