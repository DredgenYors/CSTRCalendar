///DOCUMENT EVENT LISTENERS////////////////////////////////////////////////////////////////////////////////////

let swiper; // Define swiper in a scope accessible to all functions

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Swiper
    swiper = new Swiper('.swiper-container', {
        loop: false,
        initialSlide: 1, // Start on slide 2 (index 1)
        slidesPerView: 3, // Display 3 slides per 
        slidesPerGroup: 1, // Shift only one slide at a time
        centeredSlides: true, // Center the slides
        spaceBetween: 10, // Space between slides
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        on: {
            reachEnd: function() {
                const swiperInstance = this;
    
                // Stop autoplay and reset to the second slide
                swiperInstance.autoplay.stop();
                swiperInstance.slideTo(1, 0, false); // Jump to the second slide without animation
    
                // Explicitly reinitialize autoplay after a short delay
                setTimeout(() => {
                    // Ensure autoplay settings are correctly reset
                    swiperInstance.params.autoplay.disableOnInteraction = false;
                    swiperInstance.autoplay.running = true;
                    swiperInstance.autoplay.paused = false;
    
                    // Restart autoplay from the second slide
                    swiperInstance.autoplay.start();
                }, 100); // Delay to ensure all state resets are processed
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    function resizeEventContainer() {
        const eventContainer = document.getElementById('event-container');
        const headerHeight = document.getElementById('events-list-header').offsetHeight;
        const containerHeight = eventContainer.parentElement.clientHeight;
        eventContainer.style.height = `${containerHeight - headerHeight}px`;
    }

    // Call resizeEventContainer initially and on window resize
    resizeEventContainer();
    window.addEventListener('resize', resizeEventContainer);
});

document.addEventListener('DOMContentLoaded', function () {
    ///CONST DEFINITIONS///

    //Sizes for margin, height, and width of the timeline
    const margin = { top: 50, right: 100, bottom: 100, left: 150 };
    const width = 1600 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    //Tooltip to be displayed when user hovers over event
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    //Dropdown and header variables
    const monthDropdown = d3.select("#month-dropdown");
    const dayDropdown = d3.select("#day-dropdown");
    const monthListDropdown = d3.select("#month-list-dropdown");
    const timelineHeader = d3.select("#timeline-header h2");
    const eventsListHeaderLeft = d3.select("#events-list-header-left h2");

    //Current date and array with months of the year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentDay = now.getDate(); // Get the current day
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    //SVG definition, the actual "viewport" where content is rendered in the timeline chart container
    const svg = d3.select('#d3-timeline-chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    //////////////////////

    ///FUNCTION CALLS///

    //Fetch events from all months except the current one
    fetchEventsFromNonCurrentMonths();

    //Fetch and display the next upcoming event
    fetchNextUpcomingEvent();

    ////////////////////

    ///POPULATING DROPDOWNS///

    //Populate the month dropdown with options
    months.forEach((month, index) => {
        monthDropdown.append("option").attr("value", index + 1).text(month);
    });

    //Populate the month list dropdown with options
    months.forEach((month, index) => {
        monthListDropdown.append("option").attr("value", index + 1).text(month);
    });

    //////////////////////////

    ///UPDATING DROPDOWNS///

    //Updates the timeline and header with the content from the chosen month
    monthDropdown.on("change", function () {
        console.log("Month changed to:", this.value);
        populateDays(+this.value);
        fadeOutTimeline(() => {
            updateTimeline(+this.value, +dayDropdown.property("value"));
            updateTimelineHeader(+this.value, +dayDropdown.property("value"));
            fadeInTimeline(); // Ensure timeline and header fade back in
        });
    });

    //Updates the event list and header with the content from the chosen month
    monthListDropdown.on("change", function () {
        const selectedMonth = +this.value; // Get the selected month
        fadeOutEventContainer(() => {
            updateList(+this.value);  // Fetch and display events for the selected month
            updateEventsListHeaderLeft(+this.value);
        });
        fadeOutHeaderLeft(() => {
            updateEventsListHeaderLeft(+this.value);
        });
        fadeOutNextEventContainer(() => {
            fetchNextUpcomingEvent();
        });
        // Fetch events for the selected month and generate slides
        fetchAllMonthlyEvents(selectedMonth)
    });

    //Updates the timeline and header with the content from the chosen day
    dayDropdown.on("change", function () {
        console.log("Day changed to:", this.value);
        updateTimeline(+monthDropdown.property("value"), +this.value);
        fadeOutTimeline(() => {
            updateTimeline(+monthDropdown.property("value"), +this.value);
            updateTimelineHeader(+monthDropdown.property("value"), +this.value);
            fadeInTimeline(); // Ensure timeline and header fade back in
        });
    });

    ////////////////////////

    ///DOCUMENT LISTENER FUNCTIONS///

    //Defines a function to poplate the days dropdown with days of the month
    //Parameters: month (int)
    function populateDays(month) {
        dayDropdown.selectAll("option").remove();
        const daysInMonth = new Date(now.getFullYear(), month, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dayDropdown.append("option").attr("value", i).text(i);
        }
    }

    //Defines a function to update the timeline header 
    //Parameters: month(int), day(int)
    function updateTimelineHeader(month, day) {
        const monthName = months[month - 1];
        const daySuffix = getDaySuffix(day);
        const headerElement = document.querySelector("#timeline-header-left h2");
        headerElement.innerHTML = `Events of <span class="highlight">${monthName} ${day}${daySuffix}</span>`;
    }

    //Defines a function to get the suffix of the day of the month
    //Parameters: day (int)
    function getDaySuffix(day) {
        if (day > 3 && day < 21) return 'th'; // Covers 11th to 20th
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    //Defines a fundtion to update the events list header
    //Parameters: month (int)
    function updateEventsListHeaderLeft(month) {
        const monthName = months[month - 1];
        const headerElement = document.querySelector("#events-list-header-left h2");
        headerElement.innerHTML = `<span class="unbolded">Month of</span> <span class="highlight">${monthName}</span>`;
    }


    //Defines a funtion to update the d3 timeline
    //Parameters: month (int), day(int)
    function updateTimeline(month, day) {
        //Fetches events from the /events.json route in the python script
        fetch(`http://127.0.0.1:5000/events.json?month=${month}&day=${day}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log("Received data:", data);
                if (data.length === 0) {
                    console.log("No events found for the selected date.");
                }
                svg.selectAll("*").remove();  // Clear the previous chart

                //Define and format the current time
                const parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%S%Z");
                const formatTime = d3.timeFormat("%H:%M");

                //Define the start time, end time, event description, and event duration of the event
                data.forEach(d => {
                    if (d.start && d.end) {
                        d.start = parseTime(d.start);
                        d.end = parseTime(d.end);
                        const formattedStart = formatTime(d.start);
                        const formattedEnd = formatTime(d.end);
                        let startNumeric = convertToNumeric(formattedStart);
                        let endNumeric = convertToNumeric(formattedEnd);
                        if (endNumeric < startNumeric) {
                            endNumeric += 24; // Adjust end time for multi-day events
                        }
                        d.startNumeric = startNumeric;
                        d.endNumeric = endNumeric;
                        d.eventDuration = calculateEventDuration(d.start, d.end);
                    }
                    d.event = d.summary;  // Assuming 'summary' is the field for event names
                });

                //Define scales and axes for the timeline
                const x = d3.scaleLinear().domain([0, 24]).range([0, width]);
                const y = d3.scaleBand()
                    .domain(data.map(d => d.event))
                    .range([0, height])
                    .padding(0.2);  // Adjust padding

                const xAxis = d3.axisBottom(x).ticks(24).tickFormat(d => `${d}:00`);
                const yAxis = d3.axisLeft(y);

                //Append the x-axis to the svg
                svg.append('g')
                    .attr("class", "x axis")
                    .attr('transform', `translate(0, ${height})`)
                    .call(xAxis)
                    .call(g => g.selectAll('.tick line')
                        .clone()
                        .attr('y2', -height)
                        .attr('stroke-opacity', 0.1));

                //Append the y-axis to the svg
                svg.append('g')
                    .attr("class", "y axis")
                    .call(yAxis)
                    .call(g => g.selectAll('.tick line')
                        .clone()
                        .attr('x2', width)
                        .attr('stroke-opacity', 0.1));

                // Select all x-axis text elements and set font properties
                d3.selectAll(".x.axis text, .y.axis text")
                    .style("font-family", "'Roboto', Arial, sans-serif")
                    .style("font-weight", "400")
                    .style("font-size", "12px");  // Adjust as needed

                d3.selectAll(".x.axis text, .y.axis text")
                    .classed("axis-text", true);

                //Create the event rectangles
                svg.selectAll('rect')
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('x', d => {
                        console.log('Start Numeric:', d.startNumeric); // Log start numeric position
                        return x(d.startNumeric);
                    })
                    .attr('y', d => {
                        console.log('Event:', d.event); // Log event name
                        return y(d.event);
                    })
                    .attr('width', d => {
                        console.log('End Numeric:', d.endNumeric); // Log end numeric position
                        return x(d.endNumeric) - x(d.startNumeric);
                    })
                    .attr('height', y.bandwidth())
                    .attr('fill', 'rgb(205, 0, 0)')
                    .attr('rx', 20) // Set the x-axis corner radius
                    .attr('ry', 20) // Set the y-axis corner radius
                    .on('mouseover', function (event, d) {
                        console.log('Mouseover Event:', d); // Log event data
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('fill', 'rgb(240, 0, 0)'); // Change to hover color
                        // Format the time to HH:MM AM/PM
                        const formatTime = d3.timeFormat("%I:%M %p");
                        const startTime = formatTime(d.start);
                        const endTime = formatTime(d.end);

                        console.log('Start Time:', startTime); // Log formatted start time
                        console.log('End Time:', endTime); // Log formatted end time

                        // Set the tooltip content and position
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(`${d.event}<br/>Start: ${startTime}<br/>End: ${endTime}`)
                            .style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on('mouseout', function () {
                        console.log('Mouseout Event'); // Log when mouseout occurs
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('fill', 'rgb(205, 0, 0)'); // Revert to original color
                        tooltip.transition().duration(500).style("opacity", 0);
                    });

                //Apply the fade in animation
                document.getElementById('d3-timeline-chart').classList.add('fade-in');
            })
            .catch(error => console.error('Error loading the events:', error));
    }

    /////////////////////////////////

    ///DROPDOWNS,TIMELINE, EVENTS LIST, AND HEADER INITIALIZATION///

    monthDropdown.property("value", currentMonth);
    populateDays(currentMonth);
    dayDropdown.property("value", currentDay);
    monthListDropdown.property("value", currentMonth);
    updateTimeline(currentMonth, currentDay);
    updateTimelineHeader(currentMonth, currentDay);
    updateEventsListHeaderLeft(currentMonth);

    ////////////////////////////////////////////////////////////////

    ///ANIMATIONS///

    fetchAllMonthlyEvents(currentMonth);

    ////////////////
});

document.addEventListener('DOMContentLoaded', function () {
    // Assuming you want to load the events for the current month on document load
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
    fetchAllMonthlyEvents(currentMonth);

});

document.addEventListener('DOMContentLoaded', function () {
    // Define the dropdown element
    const monthListDropdown = document.getElementById('month-list-dropdown');
    const dayDropdown = document.getElementById('day-dropdown');
    const monthDropdown = document.getElementById('month-dropdown');

    // Add event listener for the 'change' event to restore background color to white
    function restoreDropdownColor(event) {
        event.target.style.backgroundColor = 'white';
    }

    // Attach the event listener to the dropdowns
    if (monthListDropdown) {
        monthListDropdown.addEventListener('change', restoreDropdownColor);
    }

    if (dayDropdown) {
        dayDropdown.addEventListener('change', restoreDropdownColor);
    }

    if (monthDropdown) {
        monthDropdown.addEventListener('change', restoreDropdownColor);
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////

///FUNCTION DEFINITIONS///////////////////////////////////////////////////////////////////////////////

//Defines a function to convert a time string to a numeric value representing time in hours
//Parameters: time str (string) -  time in HH format
//Returns: numeric value representing total hours (int)
function convertToNumeric(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
}

//Defines a function to calculate the duration of the event in hours
//Parameters: start (Date object) - represents the start time of the event, end (Date object) - represents the end time of the event
//Returns: duration (int) - event time in hours
function calculateEventDuration(start, end) {
    let duration = (end - start) / (1000 * 60 * 60); // duration in hours
    if (duration < 0) {
        duration += 24; // Adjust for events that end after midnight
    }
    return duration;
}

let allMonthlyEvents = []; // Global array to store the monthly events
//Defines a function to fetch all events for a given month and update the UI
//Parameters: month (int)
//Returns: none (updates UI)
function fetchAllMonthlyEvents(month) {
    fetch(`http://127.0.0.1:5000/all-monthly-events.json?month=${month}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allMonthlyEvents = data; // Store the events in a global array
            console.log("All events for the month loaded:", allMonthlyEvents); // Update the UI with the fetched events
            updateEventContainer(allMonthlyEvents);
            generateSlidesFromEventList(allMonthlyEvents);
            // Fade in elements after content is loaded
            document.querySelector('#events-list-header-left h2').classList.add('fade-in'); // Fade in header after content is loaded
            document.getElementById('d3-timeline-chart').classList.add('fade-in'); // Fade in timeline after content is loaded
            document.querySelector('#timeline-header h2').classList.add('fade-in'); // Fade in timeline header after content is loaded
        })
        .catch(error => {
            console.error("Error fetching all monthly events:", error);
        });
}

//Defines a function to update the event container with a list of events for the selected month
//Parameters: events (array) - list of event objects to display
//Returns: none (updates UI)
function updateEventContainer(events) {
    const container = document.getElementById('event-container');
    if (!container) {
        console.error("The event container does not exist in the DOM.");
        return;
    }
    container.innerHTML = ''; // Clear existing content
    console.log("Updating event container with events:", events);

    if (events.length === 0) {
        console.log("No events to display.");
        container.innerHTML = '<p>No events available for this month.</p>';
        return;
    }

    const list = document.createElement('ul');
    const padding = 5; // 20px padding from the top and bottom
    const containerHeight = container.clientHeight;
    const totalEventHeight = containerHeight - 2 * padding;
    const adjustedEventHeight = totalEventHeight / events.length;

    list.style.paddingTop = `${padding}px`;
    list.style.paddingBottom = `${padding}px`;
    list.style.height = `${totalEventHeight}px`;
    list.style.overflowY = 'auto';

    events.forEach((event, index) => {
        if (!event.summary || !event.start) {
            console.log("Missing event details:", event);
        } else {
            const item = document.createElement('li');
            item.className = 'event-item';
            item.dataset.index = index; // Assign an index as a data attribute
            const date = new Date(event.start);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`; // Remove leading zeros
            item.innerHTML = `<span class="underline"><strong>${formattedDate}</strong></span> - ${event.summary}`;
            item.tabIndex = 0; // Make it focusable
            item.role = 'button'; // Accessibility role

            // Add click event listener to focus on the corresponding slide
            item.addEventListener('click', () => {
                swiper.slideTo(index);
            });

            // Set the height of each item
            item.style.height = `${adjustedEventHeight}px`;

            list.appendChild(item);
        }
    });

    container.appendChild(list);
    container.classList.remove('fade-out');
    container.classList.add('fade-in');
}

// General fade function
// Parameters:
// - element: The DOM element to apply the fade animation
// - fadeIn: Boolean indicating whether to apply fade-in (true) or fade-out (false)
// - callback: Optional callback function to execute after the animation ends
function fadeElement(element, fadeIn, callback) {
    if (!element) return;

    if (fadeIn) {
        element.classList.remove('fade-out');
        element.classList.add('fade-in');
    } else {
        element.classList.remove('fade-in');
        element.classList.add('fade-out');
    }

    element.addEventListener('animationend', function onFadeEnd() {
        element.removeEventListener('animationend', onFadeEnd);
        if (callback) callback();
    }, { once: true });
}

// Function to apply the fade animation to the events list container
function fadeOutEventContainer(callback) {
    const container = document.getElementById('event-container');
    fadeElement(container, false, callback);
}

// Function to apply the fade animation to the next event container
function fadeOutNextEventContainer(callback) {
    const container = document.getElementById('next-event-container');
    fadeElement(container, false, callback);
}

// Function to apply the fade animation to the events list header
function fadeOutHeaderLeft(callback) {
    const headerLeft = document.querySelector('#events-list-header-left h2');
    fadeElement(headerLeft, false, callback);
}

// Function to apply the fade animation to the timeline
function fadeOutTimeline(callback) {
    const timeline = document.getElementById('d3-timeline-chart');
    const timelineHeader = document.querySelector('#timeline-header h2');

    // Fade out both elements simultaneously
    fadeElement(timeline, false);
    fadeElement(timelineHeader, false, callback);
}

// Function to apply the fade-in animation to the timeline
function fadeInTimeline() {
    const timeline = document.getElementById('d3-timeline-chart');
    const timelineHeader = document.querySelector('#timeline-header h2');

    fadeElement(timeline, true);
    fadeElement(timelineHeader, true);
}

// Function to apply the fade animation to the timeline header
function fadeOutTimelineHeader(callback) {
    const timelineHeader = document.querySelector('#timeline-header h2');
    fadeElement(timelineHeader, false, callback);
}


//Defines a function to fetch events from all months except the current one
//Parameters: none
//Returns: none (organizes the fetched events)
function fetchEventsFromNonCurrentMonths() {
    fetch('http://127.0.0.1:5000/non-current-months-events.json')
        .then(response => response.json())
        .then(data => {
            console.log("Events from non-current months:", data);
            // Further processing or updating the DOM
            organizeEventsByMonth(data);
        })
        .catch(error => console.error("Error fetching events:", error));
}

//Defines a function to fetch organize events into 12 elements, each representing an element
//Parameters: events (array) - an array of event objects
//Returns: none (organizes the fetched events)
function organizeEventsByMonth(events) {
    // Create an array of 12 elements for each month
    let monthlyEvents = Array.from({ length: 12 }, () => []);

    // Organize events into the corresponding month array
    events.forEach(event => {
        let eventDate = new Date(event.start);
        let monthIndex = eventDate.getMonth(); // getMonth() returns month index (0-11)
        monthlyEvents[monthIndex].push(event);
    });

    console.log("Organized monthly events:", monthlyEvents);
}

//Defines a function to fetch and update the event list display based on the selected month
//Parameters: month (int)
//Returns: none (updates the event list)
function updateList(month) {
    fetch(`http://127.0.0.1:5000/all-monthly-events.json?month=${month}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Events loaded for the selected month:", data);
            updateEventContainer(data);  // Reuse the existing function to display events
            document.querySelector('#events-list-header-left h2').classList.add('fade-in'); // Fade in header after content is loaded
            document.getElementById('d3-timeline-chart').classList.add('fade-in'); // Fade in timeline after content is loaded
            document.querySelector('#timeline-header h2').classList.add('fade-in'); // Fade in timeline header after content is loaded
        })
        .catch(error => {
            console.error("Error fetching monthly events:", error);
        });
}

//Defines a function to fetch the next upcoming event
//Parameters: none
//Returns: none (updates next event container)
function fetchNextUpcomingEvent() {
    fetch('http://127.0.0.1:5000/next-event.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch the next upcoming event');
            }
            return response.json();
        })
        .then(eventData => {
            console.log("Next upcoming event:", eventData);
            document.getElementById('next-event-container').classList.add('fade-in'); // Fade in next event container after content is loaded
        })
        .catch(error => {
            console.error("Error fetching next upcoming event:", error);
        });
}

// Function to generate Swiper slides based on the number of event items
function generateSlidesFromEventList(events) {
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    if (!swiperWrapper) {
        console.error("The Swiper wrapper does not exist in the DOM.");
        return;
    }

    swiperWrapper.innerHTML = ''; // Clear existing slides

    if (events.length === 0) {
        swiperWrapper.innerHTML = '<div class="swiper-slide">No events available.</div>';
    } else {
        events.forEach(event => {
            const eventDate = new Date(event.start).toLocaleDateString();
            const eventTitle = event.summary || 'Unknown title';
            const eventStart = formatTime(new Date(event.start));
            const eventEnd = formatTime(new Date(event.end));
            const eventLocation = event.location || 'Unknown location';

            // Create a new slide element
            const slide = document.createElement('div');
            slide.classList.add('swiper-slide');

            // Create a new div element to hold the event content
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event-item-slide');
            eventDiv.innerHTML = `
                <div class="event-date"><strong>Date:</strong> ${eventDate}</div>
                <div class="event-title"><strong>Event:</strong> ${eventTitle}</div>
                <div class="event-time"><strong>Time:</strong> ${eventStart} - ${eventEnd}</div>
                <div class="event-location"><strong>Location:</strong> ${eventLocation}</div>
            `;

            // Append the event div to the slide
            slide.appendChild(eventDiv);

            // Append the new slide to the Swiper wrapper
            swiperWrapper.appendChild(slide);
        });
    }

    // Reinitialize Swiper after adding new slides
    if (swiper) {
        swiper.update();
    } else {
        console.error("Swiper instance is not defined.");
    }
}

// Utility function to format time without leading zeros
// Function to format time without leading zeros
function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${formattedMinutes} ${ampm}`;
}




//Defines a function to update the next event container
//Parameters: eventData (object) - contains the details of the next event
//Returns: none (updates next event container)

//////////////////////////////////////////////////////////////////////////////////////////////////////

swiper.on('reachEnd', function () {
    swiper.pagination.update();
    swiper.pagination.render();
});

