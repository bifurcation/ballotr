var FETCH_URI = "https://www.ipv.sx/ballotr/fetch.pl";
var MAIL_URI = "https://www.ipv.sx/ballotr/mail.php";
var AGENDA_URI = "https://datatracker.ietf.org/iesg/agenda/agenda.json";
var BALLOT_URI = "https://datatracker.ietf.org/doc/DOCNAME/ballot.json";
var DOC_URI = "https://tools.ietf.org/id/";
var AGENDA = {};
var BALLOT = {
    /*
    "draft-example": {
        position: 0,        // Index to POS
        discuss:  "",       // TODO: DISCUSS comments
        comment:  "",       // TODO: COMMENT comments
        text: "",           // TODO: Text of the draft, for reading
    }
    */
};

var POS = [
    { class: "noposition",  name: "NO POSITION" },
    { class: "yes",         name: "YES" },
    { class: "noobjection", name: "NO OBJECTION" },
    { class: "discuss",     name: "DISCUSS" },
    { class: "abstain",     name: "ABSTAIN" },
    { class: "recuse",      name: "RECUSE" },
    { class: "noread",      name: "DIDN'T READ" },
]
var POS_CLASSES = {};
for (i in POS) { POS_CLASSES[POS[i].class] = 1; }

function haveState() {
    return (localStorage["BALLOT"])? true : false;
}

function saveState() {
    localStorage["BALLOT"] = JSON.stringify(BALLOT);
    localStorage["AGENDA"] = JSON.stringify(AGENDA);
}

function retrieveState() {
    BALLOT = JSON.parse(localStorage["BALLOT"]);
    AGENDA = JSON.parse(localStorage["AGENDA"]);
}

function deleteState() {
    delete localStorage["BALLOT"];
    delete localStorage["AGENDA"];
}

function generateBallot() {
    // Fetch the JSON agenda and populate it into a local object
    $.ajax( {
        url: FETCH_URI + "?url=" + AGENDA_URI
    } ).done( function(data) {
        // Cache a copy of the agenda
        AGENDA = JSON.parse(data);

        // Generate a ballot from the agenda
        for (item in AGENDA.sections) {
            if (AGENDA.sections[item].docs) {
                for (i in AGENDA.sections[item].docs) {
                    var name = AGENDA.sections[item].docs[i].docname;
                    if (!name.match("draft-")) {
                        // Only handle drafts, not, say, conflict reviews
                        continue;
                    }
                    BALLOT[name] = {
                        position: 0
                    };
                }
            }
        }

        saveState();
        fetchDocuments();
    });
}

function prettyBallot() {
    var pb = "";
    pb += "# " + $("#agenda").text() + "\n\n";

    $.map(BALLOT, function(value, doc) {
        // Omit documents with no position
        if (value.position == 0) {
            return;
        }

        // Document name
        pb += "## " + doc + "\n\n";

        // Position
        pb += "Position: " + POS[value.position].name + "\n\n";

        // DISCUSS comments, if present
        if ((value.position == 3)&&(value.discuss)&&(value.discuss.length > 0)) {
            pb += "### DISCUSS\n\n";
            pb += value.discuss + "\n\n";
        }

        // COMMENT comments, if present
        if ((value.comment)&&(value.comment.length > 0)) {
            pb += "### COMMENT\n\n";
            pb += value.comment + "\n\n";
        }
    });

    return pb;
}

function fetchDocuments() {
    $("#loading").text("Loading Documents...");

    var docFetches = [];

    function setText(doc) {
        return function(text) {
            BALLOT[doc].text = text;
            var loading = $("#loading").html();
            $("#loading").html( loading + "<br/>" + doc );
        };
    }

    for (var doc in BALLOT) {
        docFetches.push(
            $.ajax( {
                url: FETCH_URI + "?url=" + DOC_URI + doc,
                success: setText(doc)
            } )
        );
    }

    $.when.apply($, docFetches).done( function() {
        saveState();
        createInterface();
    });
}

function showOverlay(doc) {
    $("#" + doc + "-overlay").show();
    $("#container").hide();
}

function hideOverlay(doc) {
    $("#container").show();
    $("#" + doc + "-overlay").hide();
}

function toggleSidebar() {
    $(this).parent().parent().find(".sidebar").toggle();
    // \u2191 == up arrow, \u2193 == down arrow
    if ($(this).text() === "\u2191") {
        $(this).text("\u2193");
    } else {
        $(this).text("\u2191");
    }
}

function incrementPosition(doc) {
    BALLOT[doc].position = (BALLOT[doc].position + 1) % POS.length;
    drawPositions();
    saveState();
}

function drawPositions() {
    function drawElement(element, id) {
        // Remove any current position classes
        var classes = element.attr("class").split(" ");
        for (i in classes) {
            if (classes[i] in POS_CLASSES) {
                element.removeClass(classes[i]);
            }
        }

        // Add the current text and class
        element.find(".position").text( POS[BALLOT[id].position].name );
        element.addClass( POS[BALLOT[id].position].class );
    }

    $("#docs").children().each(function() {
        var id = $(this).attr("id");
        drawElement($(this), id);
    });
    $("#overlays div .header").each(function() {
        var id = $(this).parent().attr("id").replace("-overlay","");
        drawElement($(this), id);
    });

    $("#overlays .discussP").each(function() {
        var doc = $(this).parent().parent().attr("id").replace("-overlay","");
        if (BALLOT[doc].position == 3) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function startOver() {
    // Delete local state
    deleteState();
    // Reload to show blank ballot
    location.reload();
}

function createInterface() {
    // XXX: Assumes that BALLOT is populated

    // 0. Add the date to the agenda
    $("#agenda").text("IESG TELECHAT AGENDA " + AGENDA["telechat-date"])

    // 1. Create DOM
    var docTemplate = '<div id="DOC" class="block"><span class="name">DOC</span><div class="position"></div></div>';
    var overlayTemplate = ""
        + '<div id="DOC-overlay" class="overlay">'
        + '<div class="main"><pre></pre></div>'
        + '<div class="sidebar">'
        + '    <p class="discussP">DISCUSS: <br/> <textarea class="discussComment"></textarea> <br/><br/></p>'
        + '    <p class="commentP">COMMENT: <br/> <textarea class="commentComment"></textarea> <br/><br/></p>'
        + '    <div class="save">SAVE</div>  <br/>'
        + '</div>'
        + '<div class="header">'
        + '    <span class="close">X</span>'
        + '    <span class="title">DOC [<span class="bigger">A</span><span class="smaller">A</span>]</span>'
        + '    <span class="comment">&uarr;</span>'
        + '    <span class="position"></span>'
        + '</div>'
        + '</div>';
    var docs = Object.keys(BALLOT).sort();
    for (var i in docs) {
        var doc = docs[i];

        // BLOCK ELEMENT FOR DOCUMENT
        var block = $(docTemplate.replace(/DOC/g, doc));
        $("#docs").append(block);


        // OVERLAY ELEMENT FOR DOCUMENT
        var overlay = $(overlayTemplate.replace(/DOC/g, doc));
        $("#overlays").append(overlay);
        overlay.hide();

        // Populate document text
        overlay.find(".main pre").text(BALLOT[doc].text);

        // Populate comment boxes
        overlay.find(".sidebar .commentComment").text(BALLOT[doc].comment);
        overlay.find(".sidebar .discussComment").text(BALLOT[doc].discuss);
    }

    // 1.*. Fill in position texts and colors
    drawPositions();

    // 2. Attach actions to DOM

    // 2.1. Show overlay
    $("#docs .name").click( function() {
        var id = $(this).parent().attr("id");
        showOverlay(id);
    });

    // 2.2. Hide overlay
    $("#overlays .close").click( function() {
        var id = $(this).parent().parent().attr("id").replace("-overlay","");
        hideOverlay(id);
    })

    // 2.3. Update position
    $("#docs .position").click( function() {
        var id = $(this).parent().attr("id");
        incrementPosition(id);
    });
    $("#overlays .position").click( function() {
        var id = $(this).parent().parent().attr("id").replace("-overlay","");
        incrementPosition(id);
    });

    // 2.4. Show/hide comment sidebar (then go ahead and hide)
    $("#overlays .comment").click( toggleSidebar );
    $("#overlays .comment").click();

    // 2.5. Save comments
    $("#overlays .save").click( function() {
        var id = $(this).parent().parent().attr("id").replace("-overlay","");
        var dc = $(this).parent().find(".discussComment")[0].value;
        var cc = $(this).parent().find(".commentComment")[0].value;

        if (dc.length > 0) { BALLOT[id].discuss = dc; }
        if (cc.length > 0) { BALLOT[id].comment = cc; }
        saveState();
    });
    // Auto-save
    $("#overlays .discussComment").change( function() { $(this).parent().parent().find(".save").click() } );
    $("#overlays .commentComment").change( function() { $(this).parent().parent().find(".save").click() } );

    // 2.6. Make fonts bigger / smaller
    function changeFontSize(x) {
        return function() {
            var size = unit = $(".main pre").css("font-size");
            size = parseInt( size.replace(/[^0-9]*/g, ""));
            unit = unit.replace(/[0-9]*/g, "");
            size += x;
            $(".main pre").css("font-size", size + unit);
        }
    }
    $(".bigger").click( changeFontSize(2)  );
    $(".smaller").click( changeFontSize(-2) );

    // 2.7. Reload the page
    $("#reload").click( function() {
        var really = window.confirm("Are you sure?  This will delete your ballot positions and comments.");
        if (really) { startOver(); }
    });

    // 2.8. Show "send email" overlay
    $("#email").click( function() {
        // Populate email field
        $("#emailBody").text( prettyBallot() );
        $("#sendEmail").fadeIn();
    });

    // 2.9. Actually send email
    $("#sendEmailButton").click( function() {
        // (Loosely) Verify the email field
        var email = $("#emailAddress")[0].value;
        if(email.indexOf("@") == -1) {
            alert("Please enter a valid email address");
            return;
        }

        // Send the email
        // startOver();
        $.post(
            MAIL_URI,
            {
                to: email,
                subject: $("#agenda").text(),
                body: $("#emailBody").text()
            }
        ).done( function() {
            alert("Ballot submitted!");
            $("#sendEmail").fadeOut();
        }).fail( function() {
            alert("Error sending email.");
        });
    });

    // 2.10. Cancel email sending
    $("#cancelEmailButton").click( function() {
        $("#sendEmail").fadeOut();
    });

    // 3. Make the cursor a pointer for clickable things
    $("#docs .name").addClass("clickable");
    $("#docs .position").addClass("clickable");
    $("#overlays .position").addClass("clickable");
    $("#overlays .close").addClass("clickable");
    $("#overlays .comment").addClass("clickable");
    $("#overlays .save").addClass("clickable");
    $("#overlays .bigger").addClass("clickable");
    $("#overlays .smaller").addClass("clickable");
    $("#reload").addClass("clickable");
    $("#email").addClass("clickable");

    // 4. Swap out the real interface for the loading indicator
    $("#loading").hide();
    $("#container").show("fade", {}, 1000);
}

$(document).ready( function() {
    // Hide everything but the loading block
    $("#container").hide();
    $("#sendEmail").hide();
    $("#loading").show();
    // Pulse loading block
    $("#loading").effect("pulsate", { times: 100 }, 200000);

    // Check for pre-existing ballot
    if (haveState()) {
        // If ballot exists, createInterface()
        retrieveState();
        createInterface();
    } else {
        // Else, generateBallot
        generateBallot();
    }
});

$(document).unload( function() {
    // Save state
    saveState();
});


