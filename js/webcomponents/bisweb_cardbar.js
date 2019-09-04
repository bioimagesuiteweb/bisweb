const $ = require('jquery');
const bis_webutil = require('bis_webutil.js');

class BiswebCardBar extends HTMLElement {

    constructor() {
        super();
        this.cards = [];
        this.createdBottomNavbar = false;
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
                        <ul class='nav nav-tabs bisweb-bottom-nav-tabs' role='tablist'></ul>
                        <div class='tab-content bisweb-sliding-tab bisweb-collapse'></div>
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

        this.createTab('Example').then( (obj) => {
            obj.content.append('<a>Hello!</a>');
        });

        this.createdBottomNavbar = true;
        document.dispatchEvent(new CustomEvent('bis.cardbar.done'));
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
     * Creates the tab and associated tab content pane in the bottom card bar.
     * If the tab hasn't been created yet then it will wait for the 'bis.cardbar.done' event to be emitted by the cardbar creator method.
     * @param {String} title - The name of the tab 
     */
    createTab(title, content = $(`<div></div>`)) {
        return new Promise( (resolve, reject) => {
            if (!this.createdBottomNavbar) {
                document.addEventListener('bis.cardbar.done', () => {
                    makeTab();
                }, { 'once' : true });
            } else {
                makeTab();
            }
    
            const self = this;
            function makeTab() {
                try {
                    let tabId = bis_webutil.getuniqueid();
                    let tab = $(`<li class='nav-item'><a class='nav-link' href='#${tabId}' role='tab' data-toggle='tab'>${title}</a></li>`);
                    let tabContent = $(`<div id='${tabId}' class='tab-pane fade' role='tabpanel'></div>`);
                    
                    tabContent.append(content);
                    self.addTabHideButton(content);
                    self.cardLayout.find('.bisweb-bottom-nav-tabs').append(tab);
                    self.cardLayout.find('.tab-content').append(tabContent);
            
                    resolve({ 'tab' : tab, 'content' : tabContent });
                } catch(e) {
                    reject(e);
                }
            }
        });
        
       
    }
}

bis_webutil.defineElement('bisweb-cardbar', BiswebCardBar);