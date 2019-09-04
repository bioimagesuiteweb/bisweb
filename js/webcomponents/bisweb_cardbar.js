const $ = require('jquery');
const bis_webutil = require('bis_webutil.js');

class BiswebCardBar extends HTMLElement {

    constructor() {
        super();
        this.cards = [];
    }

    connectedCallback() {
        this.bottomNavbarId = this.getAttribute('bis-botmenubarid');
        bis_webutil.runAfterAllLoaded(() => {
            this.bottomNavbar = document.querySelector(this.bottomNavbarId);
            let navbarTitle = this.getAttribute('bis-cardbartitle');
            this.createBottomNavbar(navbarTitle);
        });
    }

    createBottomNavbar(navbarTitle) {
        let bottomNavElement = $(this.bottomNavbar).find('.navbar.navbar-fixed-bottom');
        let bottomNavElementHeight = bottomNavElement.css('height');

        this.cardLayout = $(`
        <nav class='navbar navbar-expand-lg navbar-fixed-bottom navbar-dark' style='min-height: 50px; max-height: 50px;'>
            <div class='pos-f-b'>
                <div id='bisweb-plot-navbar' class='collapse' style='position: absolute; bottom: ${bottomNavElementHeight}'>
                    <div class='bg-dark p-4'>
                        <ul class='nav nav-tabs bisweb-bottom-nav-tabs' role='tablist'>
                            <li class='nav-item'>
                                <a class='nav-link' href='#firstTab' role='tab' data-toggle='tab'>Example</a>
                            </li>
                            <li class='nav-item'> 
                                <a class='nav-link' href='#secondTab' role='tab' data-toggle='tab'>Another example</a>
                            </li>
                        </ul>
                        <div class='tab-content bisweb-sliding-tab bisweb-collapse'>
                                <div id='firstTab' class='tab-pane fade' role='tabpanel'>
                                    <a>Hello!</a>
                                </div>
                                <div id='secondTab' class='tab-pane fade' role='tabpanel'>
                                    <a>How's it going?<br><br><br><br></a>
                                </div>
                        </div>
                    </div>
                </div>
            </div> 
        </nav>
        `);

        const expandButton = $(`
            <button class='btn navbar-toggler' type='button' data-toggle='collapse' data-target='#bisweb-plot-navbar' style='visibility: hidden;'>
            </button>
        `);

        const navbarExpandButton = $(`<span><span class='glyphicon glyphicon-menu-hamburger bisweb-span-button' style='position: relative; top: 3px; left: 5px; margin-right: 10px'></span>${navbarTitle}</span>`);
        navbarExpandButton.on('click', () => { expandButton.click(); });
        
        let tabs = $(this.cardLayout).find('.tab-content>div');
        this.addTabHideButton(tabs);

        //append card layout to the bottom and the expand button to the existing navbar
        bottomNavElement.append(navbarExpandButton);
        bottomNavElement.append(expandButton);
        $(this.bottomNavbar).prepend(this.cardLayout);

        this.createTab('Example').content.append('<a>Hello!</a>');
    }

    /**
     * Adds the tab hide button to the content of a given tab, which will slide down the tab content and remove the 'active' class from the tab itself.
     * 
     * @param {JQuery} body - The content associated with the tab. 
     */
    addTabHideButton(body) {
        let hideButton = $(`<span style='position: relative; float: right; top: 0;'><span class='glyphicon glyphicon-chevron-down bisweb-span-button'></span></span>`);
        $(hideButton).on('click', () => {
            let activeTab = $(this.cardLayout).find('.bisweb-bottom-nav-tabs .active');
            let activeContent = $(this.cardLayout).find('.tab-pane.active.in');
            activeTab.removeClass('active');
            activeContent.removeClass('active in');        
        });

        body.append(hideButton);
    }

    /**
     * Creates the tab and associated tab content pane in the bottom card bar. Note that this does not actually put anything in the tab content pane, but simply creates it.
     * 
     * @param {String} title - The name of the tab 
     */
    createTab(title) {
        let tabId = bis_webutil.getuniqueid();
        let tab = $(`<li class='nav-item'><a class='nav-link' href='#${tabId}' role='tab' data-toggle='tab'>${title}</a></li>`);
        let tabContent = $(`<div id='${tabId}' class='tab-pane fade' role='tabpanel'></div>`);

        this.cardLayout.find('.bisweb-bottom-nav-tabs').append(tab);
        this.cardLayout.find('.tab-content').append(tabContent);

        return { 'tab' : tab, 'content' : tabContent };
    }
}

bis_webutil.defineElement('bisweb-cardbar', BiswebCardBar);