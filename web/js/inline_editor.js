var INLINE_EDIT_COL_MAP = {
    short_short_desc: 'summary',
    assigned_to_realname: 'assigned_to',
    actual_time: 'work_time',
};


var inlineEditCancel = function(ev)
{
    var button = $(ev.currentTarget);
    _closeInlineEdit(button);
};

var _closeInlineEdit = function(button)
{
    button.button({
        label: 'Edit',
        text: false,
        icons: {primary: 'ui-icon-pencil'},
    }).off('click').on('click', openInlineEdit);
    var row = button.parents('tr').eq(0);
    row.next('tr.editor_row').remove();
    row.next('tr.comment_row').remove();
};


var openInlineEdit = Bug.initOnCall(function(ev)
{
    var button = $(ev.currentTarget);
    var row = button.parents('tr').eq(0);
    var bug = button.data('bug');
    if (bug == undefined) {
        var bugId = row.attr('id').slice(1);
        Bug.get(bugId, function(bug) {
            button.data('bug', bug);
            bug.updated(_inlineEditUpdate);
            _openInlineEdit(bug, button, row);});
    } else {
        _openInlineEdit(bug, button, row);
    }
});

var _openInlineEdit = function(bug, button, row)
{
    button.button({
        text: false,
        label: 'Cancel',
        icons: {primary: 'ui-icon ui-icon-arrowreturnthick-1-w'},
    }).off('click').on('click', inlineEditCancel);

    var colCount = row.find('td').size();
    var editRow = $('<tr class="editor_row"><td></td></tr>');
    INLINE_EDIT_COLUMNS.forEach(function(col) {
        var name = INLINE_EDIT_COL_MAP[col] || col;
        var cell = $('<td></td>');
        cell.addClass('bz_'+col+'_column');
        editRow.append(cell);
        var fd = Bug.fd(name);
        if (fd == undefined || fd.immutable) return;
        row.find('td.bz_' + col + '_column').data('name', fd.name);
        var input = bug.createInput(fd, false, true);
        if (['remaining_time', 'estimated_time', 'work_time'].indexOf(fd.name) > -1){
            input.css('width', '4em');
        } else {
            input.css('width', '100%');
        }
        if (fd.name == 'work_time') cell.append("+");
        cell.append(input);
    });
    var cell = $('<td class="button_column"></td>');
    var saveButton = $('<buton class="inline_edit" type="button">Save</button>').button({
        text: false,
        icons: {primary: 'ui-icon-disk'},
    });
    cell.append(saveButton);
    editRow.append(cell);
    saveButton.on('click', _inlineEditSave);
    row.after(editRow);

    commentRow = $('<tr class="comment_row"><td></td></tr>');
    var cell = $('<td colspan="'+INLINE_EDIT_COLUMNS.length+'"></td>');
    cell.append("Comment:");
    var comment = $('<textarea name="comment" rows="1" cols="80"></textarea>');
    comment.focus(function(ev) { $(ev.currentTarget).attr('rows', 5)});
    cell.append(comment);
    commentRow.append(cell);
    commentRow.append('<td>');
    editRow.after(commentRow);
};

var _inlineEditSave = function(ev)
{
    var row = $(ev.currentTarget).parents('tr').eq(0).prev("tr.bz_bugitem");
    var button = row.find('button');
    var bug = button.data('bug');
    var editRows = row.next('tr.editor_row');
    editRows.pushStack(row.next('tr.comment_row'));

    editRows.find('*').filter(':input').each(function() {
        // Make sure all values are set
        var input = $(this);
        var name = input.attr('name');
        if (!name) return;
        bug.set(name, input.val());
    });
    bug.save().done(function() {
        // Update bug row when save is done
        _closeInlineEdit(button);
    });
};

var _inlineEditUpdate = function(bug, name, value)
{
    var row = $('table.bz_buglist tr#b'+bug.value('id'));
    row.find('td').not('.button_column').each(function() {
        var element = $(this);
        if(element.data('name') != name) return;
        name = name == 'work_time' ? 'actual_time' : name;
        if (Bug.fd(name).multivalue)
            value = value.join(', ');
        if(value != undefined) element.find('span,a').pushStack(element).first().text(value);
    });
};

var initInlineEditor = function() {
    var rows = $('table.bz_buglist tr.bz_bugitem');
    rows.append('<td class="button_column"><button type="button" class="inline_edit"></button></td>');
    $('table.bz_buglist button.inline_edit').button({
        label: 'Edit',
        text: false,
        icons: {primary: 'ui-icon-pencil'},
    }).click(openInlineEdit);
    $('tr.bz_time_summary_line').append('<td class="bz_total">');
};