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

        const cardLayout = $(`
            <nav class='navbar navbar-expand-lg navbar-dark bg-dark' style='min-height: 50px; max-height: 50px;'>
                <div class='pos-f-t'>
                    <div class='collapse' id='bisweb-plot-navbar'>
                        <div class='bg-dark p-4'>
                            <ul class='navbar-nav mr-auto'>
                                <li class='nav-item active'>
                                    <a class='nav-link' href='#'>Example</a>
                                </li>
                                <li class='nav-item'> 
                                    <a class='nav-link' href='#'>Another example</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div> 
            </nav>
        `);

        const expandButton = $(`
            <button class='btn navbar-toggler' type='button' data-toggle='collapse' data-target='#bisweb-plot-navbar' style='background-color: #375a7f; visibility: hidden;'>
            </button>
        `);

        const navbarExpandButton = $(`<span class='glyphicon glyphicon-menu-hamburger' style='position: relative; top: 3px; left: 5px;'></span>`);
        navbarExpandButton.on('click', () => { expandButton.click(); console.log('clicked expand'); });

        let bottomNavElement = $(this.bottomNavbar).find('.navbar.navbar-fixed-bottom');

        //append card layout to the bottom and the expand button to the existing navbar
        bottomNavElement.append(navbarExpandButton);
        bottomNavElement.append(expandButton);
        $(this.bottomNavbar).prepend(cardLayout);
    }
}

bis_webutil.defineElement('bisweb-cardbar', BiswebCardBar);