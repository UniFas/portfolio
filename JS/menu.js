
"use strict";
let menuIcon=document.querySelector("#menuIcon");

menuIcon.onclick=function(){
    showMenu(this);
};

 function showMenu(x){
 x.classList.toggle("change");
 let menu=document.querySelector("#navbar");
if (menu.style.maxHeight && menu.style.maxHeight !== "0px") {
  menu.style.maxHeight = "0px";
} else {
  menu.style.maxHeight = "210px";
}
 }
